// compress.js — 图片压缩工具（纯叶子，零外部依赖）
// 使用 Canvas 将图片缩放/压缩/裁剪后转为 base64 或 Blob
// 用于离线模式 + 裁剪功能 + 壁纸转换

// 将 uni.chooseImage 返回的临时文件路径转为稳定的 data URL
// uni-app H5 模式的 tempFilePaths 是 blob URL，可能过期
// 此函数 fetch 后转为 data URL 确保永久可用
async function tempFilePathToDataURL(filePath) {
  const resp = await fetch(filePath)
  const blob = await resp.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(blob)
  })
}

// 将图片文件缩放并压缩，返回 base64 data URL
// maxWidth/maxHeight: 最大尺寸（等比缩放），默认 600
// quality: JPEG 质量 0~1，默认 0.7
function compressToBase64(filePath, maxWidth = 600, maxHeight = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = filePath
  })
}

// 按裁剪区域裁剪图片，返回裁剪后的 data URL
// filePath: 图片路径或 data URL
// cropRect: { x, y, w, h } — 0~1 的百分比位置
// maxWidth: 裁剪后最大宽度（等比缩放）
function cropToDataURL(filePath, cropRect, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img
      // 计算实际像素裁剪坐标
      const sx = Math.round(cropRect.x * naturalWidth)
      const sy = Math.round(cropRect.y * naturalHeight)
      const sw = Math.round(cropRect.w * naturalWidth)
      const sh = Math.round(cropRect.h * naturalHeight)

      // 计算输出尺寸（不超过 maxWidth）
      let outW = sw, outH = sh
      if (outW > maxWidth) {
        const ratio = maxWidth / outW
        outW = maxWidth
        outH = Math.round(outH * ratio)
      }

      // 创建 Canvas 并绘制裁剪区域
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

      // 导出
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = filePath
  })
}

// 将 data URL 转换为临时文件路径（供 uni.uploadFile 使用）
// 写入到 uni 文件系统后返回文件路径
async function dataURLToTempFile(dataURL) {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager?.()
    if (fs) {
      const filePath = '_tmp_crop_' + Date.now() + '.jpg'
      fs.writeFile({ filePath, data: dataURL.replace(/^data:image\/\w+;base64,/, ''), encoding: 'base64', success: () => resolve(filePath), fail: reject })
    } else {
      // H5 降级：用 Canvas 转 Blob → Blob URL
      const blob = dataURLToBlob(dataURL)
      const url = URL.createObjectURL(blob)
      resolve(url)
    }
  })
}

// 将 base64 data URL 转换为 Blob
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',')
  const mime = parts[0].match(/:(.*?);/)[1]
  const bytes = atob(parts[1])
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}

// 将 Blob 转回 base64 data URL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Blob 读取失败'))
    reader.readAsDataURL(blob)
  })
}

export default { tempFilePathToDataURL, compressToBase64, cropToDataURL, dataURLToTempFile, dataURLToBlob, blobToDataURL }
