// =============================================================================
// SERVICIO DE COMPRESIÓN AL VUELO - DOCTOR PYME SG-SST
// Optimización de imágenes, evidencias y firmas en el cliente para ahorro de almacenamiento
// =============================================================================

class CompressionService {
  /**
   * Comprime una imagen (File o Blob) antes de subirla
   * Reduce resolución máxima a 1600px y codifica en WebP/JPEG al 80%
   */
  async comprimirImagen(fileOrBlob, opciones = {}) {
    const {
      maxWidth = 1600,
      maxHeight = 1200,
      calidad = 0.8,
      formatoSalida = 'image/webp'
    } = opciones;

    return new Promise((resolve, reject) => {
      const originalSize = fileOrBlob.size || 0;
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Error al leer el archivo para compresión'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagen inválido o corrupto'));
        img.onload = () => {
          let { width, height } = img;

          // Redimensionar si excede el tamaño máximo
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Probar soporte de WebP con fallback a JPEG
          let mime = formatoSalida;
          let dataUrl = canvas.toDataURL(mime, calidad);
          if (!dataUrl.startsWith(`data:${mime}`)) {
            mime = 'image/jpeg';
            dataUrl = canvas.toDataURL(mime, calidad);
          }

          canvas.toBlob((blob) => {
            const compressedSize = blob ? blob.size : Math.round(dataUrl.length * 0.75);
            const ratio = originalSize > 0 ? ((1 - (compressedSize / originalSize)) * 100).toFixed(1) : 0;

            resolve({
              ok: true,
              dataUrl,
              blob: blob || fileOrBlob,
              mime,
              originalSize,
              compressedSize,
              ahorroPorcentaje: Math.max(0, parseFloat(ratio)),
              ancho: width,
              alto: height
            });
          }, mime, calidad);
        };
        img.src = e.target.result;
      };

      reader.readAsDataURL(fileOrBlob);
    });
  }

  /**
   * Comprime y recorta la firma capturada en canvas a un WebP ultra-liviano
   */
  comprimirFirmaCanvas(canvas) {
    if (!canvas) return null;

    // Recortar espacio en blanco alrededor de la firma (Auto-crop)
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let tieneTrazos = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[((y * width) + x) * 4 + 3];
        if (alpha > 20) {
          tieneTrazos = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!tieneTrazos) return null;

    // Agregar padding suave
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = croppedWidth;
    cropCanvas.height = croppedHeight;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

    // Guardar en WebP comprimido con fondo transparente
    let dataUrl = cropCanvas.toDataURL('image/webp', 0.85);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = cropCanvas.toDataURL('image/png');
    }

    return {
      dataUrl,
      width: croppedWidth,
      height: croppedHeight,
      sizeBytes: Math.round(dataUrl.length * 0.75)
    };
  }
}

export const compressionService = new CompressionService();
export const comprimirImagen = (fileOrBlob, opciones) => compressionService.comprimirImagen(fileOrBlob, opciones);
export const comprimirFoto = (fileOrBlob, opciones) => compressionService.comprimirImagen(fileOrBlob, opciones);
export const comprimirFirma = (canvas) => compressionService.comprimirFirma(canvas);

