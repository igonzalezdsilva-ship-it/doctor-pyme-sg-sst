# Guía Práctica Paso a Paso: Publicación de Doctor Pyme en la Nube

Esta guía te acompaña en el proceso completo para adquirir el dominio **`doctorpyme.co`**, configurar el servidor en la nube y dejar disponible tu aplicativo en **`https://www.doctorpyme.co/sst`** con su página web comercial en la raíz.

---

## 🛒 PASO 1: Adquisición del Dominio `doctorpyme.co`

1. **Registrador Recomendado**: [Namecheap.com](https://www.namecheap.com) o [DonDominio.com](https://www.dondominio.com).
   - *¿Por qué Namecheap?* Acepta tarjetas de crédito/débito internacionales, incluye privacidad WhoisGuard de por vida gratis y soporte 24/7.
2. **Búsqueda y Compra**:
   - Ingresa a Namecheap y busca el dominio: `doctorpyme.co`.
   - Agrégalo al carrito.
   - Costo aproximado primer año: **$10 - $14 USD** (unos $45.000 - $55.000 COP).
   - Completa el proceso de compra.

---

## 🛡️ PASO 2: Seguridad y DNS con Cloudflare (Gratis)

1. Crea una cuenta gratuita en [Cloudflare.com](https://www.cloudflare.com).
2. Haz clic en **"Add a Site"** e ingresa `doctorpyme.co`.
3. Selecciona el **Plan Free ($0 USD)**.
4. Cloudflare te dará 2 servidores de nombres (ejemplo: `alec.ns.cloudflare.com` y `dora.ns.cloudflare.com`).
5. En el panel de Namecheap, cambia los DNS a "Custom DNS" y pega los dos nombres provistos por Cloudflare.
   > *Beneficio*: Tu sitio quedará protegido contra ataques, cargará hasta 3 veces más rápido y tendrás certificado SSL flexible automático.

---

## ☁️ PASO 3: Creación del Servidor en la Nube (VPS)

1. **Proveedor Recomendado**: [DigitalOcean.com](https://www.digitalocean.com) o [Hetzner.com](https://www.hetzner.com).
2. **Crear un "Droplet" / Servidor**:
   - **Sistema Operativo**: Ubuntu 24.04 LTS x64.
   - **Plan / Tamaño**: Basic / Regular SSD con 1 GB RAM / 1 vCPU / 25 GB Disk (**$4 a $6 USD/mes**).
   - **Ubicación del Datacenter**: New York (NYC3) o Miami (ofrece la menor latencia hacia Colombia).
   - **Autenticación**: Contraseña segura de root o Llave SSH.
3. Al finalizar la creación (toma ~45 segundos), DigitalOcean te entregará una **Dirección IP Pública** (ejemplo: `164.92.120.45`).

---

## 🌐 PASO 4: Vincular el Dominio con la IP del Servidor

En tu panel de **Cloudflare -> Sección DNS**:
1. Agrega un registro tipo **A**:
   - Nombre: `@`
   - Contenido / IP: `TU_IP_DEL_SERVIDOR`
   - Proxy status: Marcado (Naranja / Proxied).
2. Agrega un segundo registro tipo **A** o **CNAME**:
   - Nombre: `www`
   - Contenido: `TU_IP_DEL_SERVIDOR` (o `doctorpyme.co`)
   - Proxy status: Marcado (Naranja / Proxied).

---

## 💻 PASO 5: Despliegue en el Servidor (Comandos de 5 Minutos)

Conéctate a tu servidor desde la terminal de tu Mac:
```bash
ssh root@TU_IP_DEL_SERVIDOR
```

Una vez dentro, ejecuta los siguientes pasos:

### 1. Ejecutar el script de aprovisionamiento
Descarga o copia el archivo `deploy/setup_server.sh` y ejecútalo:
```bash
bash setup_server.sh
```

### 2. Subir tu paquete de release de la plataforma
Desde tu Mac, envía el paquete `releases/doctor_pyme_sg_sst_v4.4_2026-10-03.zip` a tu servidor:
```bash
scp releases/doctor_pyme_sg_sst_v4.4_2026-10-03.zip root@TU_IP_DEL_SERVIDOR:/var/www/doctorpyme/
```

En el servidor, descomprímelo en la carpeta `/sst`:
```bash
cd /var/www/doctorpyme/sst
unzip /var/www/doctorpyme/doctor_pyme_sg_sst_v4.4_2026-10-03.zip
chown -R www-data:www-data /var/www/doctorpyme
```

### 3. Copiar la Landing Page en `/var/www/doctorpyme/landing`
Sube el archivo `deploy/landing/index.html` hacia `/var/www/doctorpyme/landing/index.html`.

### 4. Activar el servicio en segundo plano (Systemd)
```bash
sudo cp deploy/systemd/doctorpyme-sst.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now doctorpyme-sst
```

### 5. Configurar Nginx y Activar Certificado SSL Gratuito
```bash
sudo cp deploy/nginx/doctorpyme.conf /etc/nginx/sites-available/doctorpyme.conf
sudo ln -s /etc/nginx/sites-available/doctorpyme.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Generar el certificado de seguridad SSL con un solo comando:
sudo certbot --nginx -d doctorpyme.co -d www.doctorpyme.co
```

---

## 🎉 ¡Listo! Tu plataforma estará en vivo en:

- 🏢 **Página Comercial:** `https://www.doctorpyme.co`
- 🚀 **Plataforma SG-SST:** `https://www.doctorpyme.co/sst`

Con copias de seguridad automáticas diarias en disco, libro de auditoría legal y persistencia blindada.
