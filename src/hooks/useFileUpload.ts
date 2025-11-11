import { useState, useCallback } from 'react'
import axios from 'axios'

export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface UseFileUploadOptions {
  maxSize?: number
  entityType?: string
  entityId?: string
  onSuccess?: (file: any) => void
  onError?: (error: Error) => void
  apiUrl?: string
}

export function useFileUpload({
  maxSize = 100 * 1024 * 1024,
  entityType = 'Policy',
  entityId = '',
  onSuccess,
  onError,
  apiUrl = '/api/v1/google-drive/upload',
}: UseFileUploadOptions = {}) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = useCallback(async (file: File) => {
    const fileId = Math.random().toString(36).substring(7)
    
    // Validate file size
    if (file.size > maxSize) {
      const error = new Error(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`)
      if (onError) onError(error)
      return
    }

    // Initialize upload progress
    setUploads(prev => new Map(prev).set(fileId, {
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }))

    try {
      // Convert file to base64
      const fileData = await fileToBase64(file)
      
      // Update status to uploading
      setUploads(prev => {
        const next = new Map(prev)
        const upload = next.get(fileId)
        if (upload) {
          next.set(fileId, { ...upload, status: 'uploading', progress: 0 })
        }
        return next
      })

      setIsUploading(true)

      // Upload file
      const response = await axios.post(
        apiUrl,
        {
          fileName: file.name,
          mimeType: file.type,
          entityType,
          entityId,
          fileData: fileData.split(',')[1], // Remove data URL prefix
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0

            setUploads(prev => {
              const next = new Map(prev)
              const upload = next.get(fileId)
              if (upload) {
                next.set(fileId, { ...upload, progress })
              }
              return next
            })
          },
        }
      )

      // Update status to success
      setUploads(prev => {
        const next = new Map(prev)
        const upload = next.get(fileId)
        if (upload) {
          next.set(fileId, { ...upload, status: 'success', progress: 100 })
        }
        return next
      })

      if (onSuccess) {
        onSuccess(response.data.file)
      }

      return response.data.file
    } catch (error) {
      // Update status to error
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploads(prev => {
        const next = new Map(prev)
        const upload = next.get(fileId)
        if (upload) {
          next.set(fileId, { ...upload, status: 'error', error: errorMessage })
        }
        return next
      })

      if (onError && error instanceof Error) {
        onError(error)
      }

      throw error
    } finally {
      setIsUploading(false)
    }
  }, [maxSize, entityType, entityId, apiUrl, onSuccess, onError])

  const uploadMultiple = useCallback(async (files: File[]) => {
    setIsUploading(true)
    
    try {
      const results = await Promise.allSettled(files.map(file => uploadFile(file)))
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      return {
        successful,
        failed,
        total: files.length,
        results,
      }
    } finally {
      setIsUploading(false)
    }
  }, [uploadFile])

  const clearUpload = useCallback((fileId: string) => {
    setUploads(prev => {
      const next = new Map(prev)
      next.delete(fileId)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setUploads(new Map())
  }, [])

  return {
    uploads: Array.from(uploads.values()),
    isUploading,
    uploadFile,
    uploadMultiple,
    clearUpload,
    clearAll,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
