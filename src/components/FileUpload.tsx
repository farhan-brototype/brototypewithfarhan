import { useState } from "react";
import { Upload, X, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  bucket: "assignment-files" | "complaint-files";
  onUploadComplete: (urls: string[]) => void;
  existingFiles?: string[];
  maxFiles?: number;
}

export const FileUpload = ({ 
  bucket, 
  onUploadComplete, 
  existingFiles = [],
  maxFiles = 5 
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<string[]>(existingFiles);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }

      const newFiles = [...files, ...uploadedUrls];
      setFiles(newFiles);
      onUploadComplete(newFiles);

      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (fileUrl: string) => {
    const newFiles = files.filter(f => f !== fileUrl);
    setFiles(newFiles);
    onUploadComplete(newFiles);
  };

  const downloadFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading || files.length >= maxFiles}
          onClick={() => document.getElementById(`file-upload-${bucket}`)?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Files"}
        </Button>
        <input
          id={`file-upload-${bucket}`}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <span className="text-sm text-muted-foreground">
          {files.length}/{maxFiles} files
        </span>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileUrl, index) => {
            const fileName = fileUrl.split('/').pop() || `file-${index + 1}`;
            return (
              <div
                key={fileUrl}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1">
                  <FileIcon className="h-4 w-4" />
                  <span className="text-sm truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(fileUrl)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileUrl)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
