import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'
import { Download, Share2, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DocumentPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file?: {
    id: string
    name: string
    mimeType: string
    url: string
    thumbnailUrl?: string
    size?: number
  }
  files?: Array<{
    id: string
    name: string
    mimeType: string
    url: string
    thumbnailUrl?: string
    size?: number
  }>
  currentIndex?: number
  onNavigate?: (index: number) => void
  onDownload?: (fileId: string) => void
  onShare?: (fileId: string) => void
}

const isImageType = (mimeType: string) => mimeType.startsWith('image/')
const isPdfType = (mimeType: string) => mimeType === 'application/pdf'
const isGoogleDoc = (url: string) => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname === 'docs.google.com' || urlObj.hostname === 'drive.google.com'
  } catch {
    return false
  }
}

export function DocumentPreview({
  open,
  onOpenChange,
  file,
  files,
  currentIndex = 0,
  onNavigate,
  onDownload,
  onShare,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Determine which file to display
  const displayFile = files && files.length > 0 ? files[currentIndex] : file
  const hasMultipleFiles = files && files.length > 1
  const canNavigatePrev = hasMultipleFiles && currentIndex > 0
  const canNavigateNext = hasMultipleFiles && currentIndex < files.length - 1

  if (!displayFile) return null

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handleResetView = () => {
    setZoom(100)
    setRotation(0)
  }

  const handlePrevious = () => {
    if (canNavigatePrev && onNavigate) {
      onNavigate(currentIndex - 1)
      handleResetView()
    }
  }

  const handleNext = () => {
    if (canNavigateNext && onNavigate) {
      onNavigate(currentIndex + 1)
      handleResetView()
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(displayFile.id)
    } else {
      // Fallback: trigger browser download
      const link = document.createElement('a')
      link.href = displayFile.url
      link.download = displayFile.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare(displayFile.id)
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(displayFile.url).then(() => {
        alert('Link copied to clipboard')
      })
    }
  }

  const renderPreview = () => {
    const { mimeType, url } = displayFile

    // Image preview with zoom
    if (isImageType(mimeType)) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto p-4 bg-muted/30">
          <img
            src={url}
            alt={displayFile.name}
            className="max-w-full h-auto transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      )
    }

    // PDF preview
    if (isPdfType(mimeType)) {
      return (
        <div className="h-full w-full">
          <iframe
            src={`${url}#zoom=${zoom}`}
            className="w-full h-full border-0"
            title={displayFile.name}
          />
        </div>
      )
    }

    // Google Docs embed
    if (isGoogleDoc(url)) {
      const embedUrl = url.includes('/preview') 
        ? url 
        : url.replace('/edit', '/preview')
      
      return (
        <div className="h-full w-full">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={displayFile.name}
            allow="autoplay"
          />
        </div>
      )
    }

    // Office documents via Google Docs Viewer
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
      
      return (
        <div className="h-full w-full">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={displayFile.name}
          />
        </div>
      )
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <X className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Preview not available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This file type cannot be previewed. Please download to view.
          </p>
        </div>
        <Button onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download File
        </Button>
      </div>
    )
  }

  const showZoomControls = isImageType(displayFile.mimeType) || isPdfType(displayFile.mimeType)
  const showRotateControl = isImageType(displayFile.mimeType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{displayFile.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span className="text-xs">
                  {displayFile.mimeType}
                </span>
                {displayFile.size && (
                  <>
                    <span>•</span>
                    <span className="text-xs">
                      {formatFileSize(displayFile.size)}
                    </span>
                  </>
                )}
                {hasMultipleFiles && (
                  <>
                    <span>•</span>
                    <span className="text-xs">
                      {currentIndex + 1} of {files.length}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-6 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            {showZoomControls && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </>
            )}
            {showRotateControl && (
              <Button variant="outline" size="sm" onClick={handleRotate}>
                Rotate
              </Button>
            )}
            {(showZoomControls || showRotateControl) && (
              <Button variant="outline" size="sm" onClick={handleResetView}>
                Reset
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasMultipleFiles && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!canNavigatePrev}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!canNavigateNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
