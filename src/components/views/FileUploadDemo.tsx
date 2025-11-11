import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import { DocumentPreview } from '@/components/ui/document-preview'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, Upload as UploadIcon } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  name: string
  mimeType: string
  url: string
  size: number
  uploadedAt: Date
  thumbnailUrl?: string
}

export function FileUploadDemo() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const { uploads, isUploading, uploadFile, uploadMultiple } = useFileUpload({
    entityType: 'Demo',
    entityId: 'demo-123',
    onSuccess: (file) => {
      // Add the uploaded file to our list
      const newFile: UploadedFile = {
        id: file.id,
        name: file.fileName,
        mimeType: file.mimeType,
        url: file.webViewLink || file.webContentLink || '#',
        size: file.fileSize,
        uploadedAt: new Date(),
        thumbnailUrl: file.thumbnailLink,
      }
      setUploadedFiles(prev => [...prev, newFile])
      toast.success(`${file.fileName} uploaded successfully`)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 1) {
      await uploadFile(files[0])
    } else {
      await uploadMultiple(files)
    }
  }

  const handlePreview = (file: UploadedFile) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }

  const handleDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('File removed')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  // Demo files for testing preview
  const demoFiles: UploadedFile[] = [
    {
      id: 'demo-1',
      name: 'Sample PDF Document.pdf',
      mimeType: 'application/pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      size: 13264,
      uploadedAt: new Date(),
    },
    {
      id: 'demo-2',
      name: 'Sample Image.jpg',
      mimeType: 'image/jpeg',
      url: 'https://picsum.photos/800/600',
      size: 245678,
      uploadedAt: new Date(),
    },
  ]

  const allFiles = [...demoFiles, ...uploadedFiles]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">File Upload & Preview Demo</h2>
        <p className="text-muted-foreground mt-1">
          Demonstration of drag-and-drop file upload and document preview capabilities
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="library">
            File Library
            {allFiles.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {allFiles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supports PDF, DOCX, XLSX, PPTX, images, and ZIP files up to 100MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                multiple
                maxFiles={10}
                onFilesSelected={handleFilesSelected}
              />
            </CardContent>
          </Card>

          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Progress</CardTitle>
                <CardDescription>
                  Track the status of your file uploads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div key={upload.fileId} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.fileName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {upload.progress}%
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          upload.status === 'success'
                            ? 'default'
                            : upload.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {upload.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
              <CardDescription>
                Preview, download, or delete your uploaded files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allFiles.length === 0 ? (
                <div className="text-center py-12">
                  <UploadIcon className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No files uploaded yet. Upload some files to see them here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      {file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <UploadIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {file.mimeType.split('/')[1].toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(file)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        {!file.id.startsWith('demo-') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Preview Modal */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile || undefined}
        onDownload={(fileId) => {
          toast.success('Download started')
        }}
        onShare={(fileId) => {
          navigator.clipboard.writeText(window.location.href)
          toast.success('Link copied to clipboard')
        }}
      />
    </div>
  )
}
