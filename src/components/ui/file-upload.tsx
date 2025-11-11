import React, { useCallback, useState } from 'react'
import { Upload, X, File, Image as ImageIcon, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Progress } from './progress'

export interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  previewUrl?: string
}

interface FileUploadProps {
  maxSize?: number // in bytes, default 100MB
  maxFiles?: number
  accept?: string
  multiple?: boolean
  onFilesSelected?: (files: File[]) => void
  onUploadComplete?: (uploadedFiles: UploadFile[]) => void
  className?: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'application/zip': ['.zip'],
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType === 'application/pdf') return FileText
  return File
}

export function FileUpload({
  maxSize = MAX_FILE_SIZE,
  maxFiles = 10,
  accept,
  multiple = true,
  onFilesSelected,
  onUploadComplete,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
    }

    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim())
      const fileType = file.type
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
      
      const isAccepted = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          return fileExt === acceptedType
        }
        return fileType === acceptedType || (acceptedType.includes('*') && fileType.startsWith(acceptedType.split('*')[0]))
      })

      if (!isAccepted) {
        return 'File type not supported'
      }
    }

    return null
  }

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    if (!multiple && fileArray.length > 1) {
      fileArray.splice(1)
    }

    if (uploadFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newUploadFiles: UploadFile[] = fileArray.map(file => {
      const error = validateFile(file)
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

      return {
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
        previewUrl,
      }
    })

    setUploadFiles(prev => [...prev, ...newUploadFiles])
    
    const validFiles = fileArray.filter((_, index) => !newUploadFiles[index].error)
    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles)
    }
  }, [uploadFiles.length, maxFiles, multiple, onFilesSelected, maxSize, accept])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFiles(files)
    }
  }, [processFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(files)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFiles])

  const handleRemoveFile = useCallback((id: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Expose method to update progress
  React.useImperativeHandle(fileInputRef, () => ({
    updateProgress: (id: string, progress: number, status: UploadFile['status'], error?: string) => {
      setUploadFiles(prev => prev.map(f => 
        f.id === id ? { ...f, progress, status, error } : f
      ))
    },
    clearAll: () => {
      uploadFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
      setUploadFiles([])
    },
    getFiles: () => uploadFiles,
  }))

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 transition-colors duration-200',
          'flex flex-col items-center justify-center gap-4 cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5'
        )}
        onClick={handleBrowseClick}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'bg-primary/10 text-primary'
          )}>
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Drop files here or <span className="text-primary">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {multiple ? `Up to ${maxFiles} files` : 'Single file'}, max {Math.round(maxSize / 1024 / 1024)}MB each
            </p>
            {accept && (
              <p className="text-xs text-muted-foreground mt-1">
                Supported: {Object.values(ACCEPTED_TYPES).flat().join(', ')}
              </p>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept || Object.keys(ACCEPTED_TYPES).join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
        />
      </div>

      {uploadFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadFiles.map((uploadFile) => {
            const FileIcon = getFileIcon(uploadFile.file.type)
            
            return (
              <div
                key={uploadFile.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                {uploadFile.previewUrl ? (
                  <img
                    src={uploadFile.previewUrl}
                    alt={uploadFile.file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    {uploadFile.status === 'uploading' && (
                      <span className="text-xs text-primary">Uploading...</span>
                    )}
                    {uploadFile.status === 'success' && (
                      <span className="text-xs text-green-600">Complete</span>
                    )}
                    {uploadFile.status === 'error' && (
                      <span className="text-xs text-destructive">{uploadFile.error}</span>
                    )}
                  </div>

                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="h-1 mt-2" />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFile(uploadFile.id)
                  }}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
