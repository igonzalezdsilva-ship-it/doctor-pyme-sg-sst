require 'webrick'
require 'json'
require 'fileutils'
require 'time'

root = File.expand_path(File.dirname(__FILE__))
port = 3000

DATA_DIR = File.join(root, 'data')
BACKUPS_DIR = File.join(root, 'backups')
DB_FILE = File.join(DATA_DIR, 'database.json')
AUDIT_FILE = File.join(DATA_DIR, 'audit_log.jsonl')

FileUtils.mkdir_p(DATA_DIR)
FileUtils.mkdir_p(BACKUPS_DIR)

# Fix crítico para macOS: Evitar Errno::EPERM al invocar sendfile() vía IO.copy_stream
# Implementa lectura y escritura por bloques en sockets de red
class WEBrick::HTTPResponse
  def send_body_io(socket)
    begin
      if @request_method == "HEAD"
        # no body
      elsif chunked?
        buf = +''
        begin
          @body.readpartial(@buffer_size, buf)
          size = buf.bytesize
          data = +"#{size.to_s(16)}#{CRLF}#{buf}#{CRLF}"
          socket.write(data)
          data.clear
          @sent_size += size
        rescue EOFError
          break
        end while true
        buf.clear
        socket.write("0#{CRLF}#{CRLF}")
      else
        if %r{\Abytes (\d+)-(\d+)/\d+\z} =~ @header['content-range']
          offset = $1.to_i
          size = $2.to_i - offset + 1
          @body.seek(offset, IO::SEEK_SET) if offset
        else
          size = @header['content-length']
          size = size.to_i if size
        end
        rem = size || Float::INFINITY
        chunk_size = 65536
        while rem > 0
          to_read = [chunk_size, rem].min
          buf = @body.read(to_read)
          break unless buf && buf.bytesize > 0
          socket.write(buf)
          @sent_size += buf.bytesize
          rem -= buf.bytesize if size
        end
      end
    ensure
      @body.close if @body.respond_to?(:close)
    end
    remove_body_tempfile
  end
end

# Mime types completos para SPA y formatos modernos
mime_types = WEBrick::HTTPUtils::DefaultMimeTypes
mime_types.store 'js', 'application/javascript'
mime_types.store 'mjs', 'application/javascript'
mime_types.store 'css', 'text/css'
mime_types.store 'html', 'text/html'
mime_types.store 'json', 'application/json'
mime_types.store 'svg', 'image/svg+xml'
mime_types.store 'webmanifest', 'application/manifest+json'
mime_types.store 'jpg', 'image/jpeg'
mime_types.store 'jpeg', 'image/jpeg'
mime_types.store 'png', 'image/png'
mime_types.store 'webp', 'image/webp'

def add_cors_headers(res)
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  res['Pragma'] = 'no-cache'
  res['Expires'] = '0'
end

server = WEBrick::HTTPServer.new(
  :Port => port,
  :BindAddress => '0.0.0.0',
  :DocumentRoot => root,
  :MimeTypes => mime_types,
  :AccessLog => [],
  :RequestCallback => proc { |req, res|
    add_cors_headers(res)
  }
)

def mount_api(srv, path, &block)
  srv.mount_proc(path, &block)
  srv.mount_proc("/sst#{path}", &block)
end

# Soporte para servir la aplicación bajo la subcarpeta /sst
server.mount('/sst', WEBrick::HTTPServlet::FileHandler, root)

# -----------------------------------------------------------------------------
# API: Obtener Base de Datos Física en Disco
# -----------------------------------------------------------------------------
mount_api(server, '/api/data') do |req, res|
  add_cors_headers(res)
  if req.request_method == 'OPTIONS'
    res.status = 200
  elsif req.request_method == 'GET'
    res['Content-Type'] = 'application/json; charset=utf-8'
    if File.exist?(DB_FILE)
      res.body = File.read(DB_FILE)
    else
      res.status = 404
      res.body = { error: 'Base de datos física no encontrada en data/database.json' }.to_json
    end
  else
    res.status = 405
    res.body = { error: 'Método no permitido' }.to_json
  end
end

# -----------------------------------------------------------------------------
# API: Guardar Físicamente en Disco Duro + Auto Backup + Auditoría
# -----------------------------------------------------------------------------
mount_api(server, '/api/save') do |req, res|
  add_cors_headers(res)
  if req.request_method == 'OPTIONS'
    res.status = 200
  elsif req.request_method == 'POST'
    begin
      payload = JSON.parse(req.body)
      if payload.is_a?(Hash) && payload['empresas']
        tmp_file = "#{DB_FILE}.tmp"
        File.open(tmp_file, 'w:UTF-8') do |f|
          f.write(JSON.pretty_generate(payload))
        end
        File.rename(tmp_file, DB_FILE)

        now = Time.now
        iso_time = now.iso8601
        date_str = now.strftime('%Y-%m-%d_%H-%M-%S')

        # Auto-backup cada 3 minutos o primer guardado
        latest_backup = Dir.glob(File.join(BACKUPS_DIR, 'backup_*.json')).sort.last
        needs_backup = true
        if latest_backup && (now - File.mtime(latest_backup)) < 180
          needs_backup = false
        end

        if needs_backup
          backup_path = File.join(BACKUPS_DIR, "backup_#{date_str}.json")
          FileUtils.cp(DB_FILE, backup_path)
          all_backups = Dir.glob(File.join(BACKUPS_DIR, 'backup_*.json')).sort
          if all_backups.size > 50
            all_backups[0...(all_backups.size - 50)].each { |old_b| FileUtils.rm_f(old_b) }
          end
        end

        # Conteo de evaluaciones para trazabilidad
        eval_count = 0
        if payload['evaluaciones'].is_a?(Hash)
          payload['evaluaciones'].each_value do |ev_emp|
            if ev_emp.is_a?(Hash)
              ev_emp.each_value do |ev_yr|
                eval_count += ev_yr.size if ev_yr.is_a?(Hash)
              end
            end
          end
        end

        audit_entry = {
          timestamp: iso_time,
          action: 'SAVE_DATABASE',
          bytes: File.size(DB_FILE),
          totalEmpresas: (payload['empresas'] || []).size,
          totalEvaluaciones: eval_count,
          empresaActiva: (payload['empresas'] || [])[0]&.[]('razonSocial') || 'LADRILLOS OCHOA LTDA',
          backupGenerado: needs_backup
        }
        File.open(AUDIT_FILE, 'a:UTF-8') do |af|
          af.puts(audit_entry.to_json)
        end

        res['Content-Type'] = 'application/json; charset=utf-8'
        res.body = {
          status: 'ok',
          message: 'Datos guardados físicamente en disco duro',
          file: 'data/database.json',
          timestamp: iso_time,
          bytes: File.size(DB_FILE),
          backupCreated: needs_backup
        }.to_json
      else
        res.status = 400
        res.body = { error: 'Payload de datos inválido' }.to_json
      end
    rescue => e
      res.status = 500
      res.body = { error: e.message }.to_json
    end
  else
    res.status = 405
    res.body = { error: 'Método no permitido' }.to_json
  end
end

# -----------------------------------------------------------------------------
# API: Listar Copias de Seguridad Disponibles
# -----------------------------------------------------------------------------
mount_api(server, '/api/backups') do |req, res|
  add_cors_headers(res)
  if req.request_method == 'OPTIONS'
    res.status = 200
  elsif req.request_method == 'GET'
    backups = Dir.glob(File.join(BACKUPS_DIR, 'backup_*.json')).sort.reverse.map do |path|
      {
        filename: File.basename(path),
        sizeKB: (File.size(path) / 1024.0).round(1),
        createdAt: File.mtime(path).iso8601
      }
    end
    res['Content-Type'] = 'application/json; charset=utf-8'
    res.body = { backups: backups, total: backups.size }.to_json
  else
    res.status = 405
    res.body = { error: 'Método no permitido' }.to_json
  end
end

# -----------------------------------------------------------------------------
# API: Restaurar desde una Copia de Seguridad
# -----------------------------------------------------------------------------
mount_api(server, '/api/restore') do |req, res|
  add_cors_headers(res)
  if req.request_method == 'OPTIONS'
    res.status = 200
  elsif req.request_method == 'POST'
    begin
      body_json = JSON.parse(req.body)
      filename = File.basename(body_json['filename'] || '')
      backup_path = File.join(BACKUPS_DIR, filename)
      if File.exist?(backup_path) && !filename.empty?
        pre_b = File.join(BACKUPS_DIR, "backup_pre_restore_#{Time.now.strftime('%Y-%m-%d_%H-%M-%S')}.json")
        FileUtils.cp(DB_FILE, pre_b) if File.exist?(DB_FILE)

        FileUtils.cp(backup_path, DB_FILE)
        audit_entry = {
          timestamp: Time.now.iso8601,
          action: 'RESTORE_BACKUP',
          restoredFrom: filename,
          bytes: File.size(DB_FILE)
        }
        File.open(AUDIT_FILE, 'a:UTF-8') { |af| af.puts(audit_entry.to_json) }

        res['Content-Type'] = 'application/json; charset=utf-8'
        res.body = { status: 'ok', restoredFrom: filename, data: JSON.parse(File.read(DB_FILE)) }.to_json
      else
        res.status = 404
        res.body = { error: 'Archivo de respaldo no encontrado' }.to_json
      end
    rescue => e
      res.status = 500
      res.body = { error: e.message }.to_json
    end
  else
    res.status = 405
    res.body = { error: 'Método no permitido' }.to_json
  end
end

# -----------------------------------------------------------------------------
# API: Obtener Historial de Auditoría y Trazabilidad (Decreto 1072)
# -----------------------------------------------------------------------------
mount_api(server, '/api/audit') do |req, res|
  add_cors_headers(res)
  if req.request_method == 'OPTIONS'
    res.status = 200
  elsif req.request_method == 'GET'
    entries = []
    if File.exist?(AUDIT_FILE)
      File.readlines(AUDIT_FILE).last(50).reverse_each do |line|
        begin
          entries << JSON.parse(line.strip) unless line.strip.empty?
        rescue
        end
      end
    end
    res['Content-Type'] = 'application/json; charset=utf-8'
    res.body = { auditTrail: entries, total: entries.size }.to_json
  else
    res.status = 405
    res.body = { error: 'Método no permitido' }.to_json
  end
end

trap 'INT' do server.shutdown end
trap 'TERM' do server.shutdown end

puts "\n"
puts "================================================================="
puts "🚀 PLATAFORMA DE GESTIÓN SG-SST DOCTOR PYME EN EJECUCIÓN"
puts "   Persistencia Física en Disco Duro: data/database.json"
puts "   Motor de Backups Automáticos: backups/"
puts "   Trazabilidad Legal: data/audit_log.jsonl (Decreto 1072)"
puts "================================================================="
puts "🌐 Servidor local activo en: http://localhost:#{port}"
puts "👉 Abre tu navegador en la dirección anterior."
puts "Presiona Ctrl+C en cualquier momento para detener el servidor.\n"

server.start
