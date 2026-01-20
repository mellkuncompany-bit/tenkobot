"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { getDocument } from "@/lib/services/document-service";
import { Document, DocumentCategory } from "@/lib/types/firestore";
import { ArrowLeft, Download, FileText, Calendar } from "lucide-react";

export default function DocumentDetailPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin || !params.id) return;

    const fetchDocument = async () => {
      try {
        const data = await getDocument(params.id as string);
        setDocument(data);
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [admin, params.id]);

  const getCategoryLabel = (category: DocumentCategory) => {
    switch (category) {
      case "manual":
        return "作業マニュアル";
      case "policy":
        return "ポリシー";
      case "other":
        return "その他";
      default:
        return category;
    }
  };

  const getCategoryBadge = (category: DocumentCategory) => {
    switch (category) {
      case "manual":
        return <Badge variant="default">{getCategoryLabel(category)}</Badge>;
      case "policy":
        return <Badge variant="secondary">{getCategoryLabel(category)}</Badge>;
      case "other":
        return <Badge variant="outline">{getCategoryLabel(category)}</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDownload = () => {
    if (!document) return;
    window.open(document.fileUrl, "_blank");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          読み込み中...
        </div>
      </DashboardLayout>
    );
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/documents")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ドキュメントが見つかりません</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/documents")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{document.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                {getCategoryBadge(document.category)}
                {document.isActive ? (
                  <Badge variant="outline" className="text-green-600">
                    有効
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">
                    無効
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              ダウンロード
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ドキュメント情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  説明
                </h3>
                <p className="text-gray-600">{document.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  ファイル名
                </h3>
                <p className="text-gray-600">{document.fileName}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  ファイルサイズ
                </h3>
                <p className="text-gray-600">
                  {formatFileSize(document.fileSize)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  ファイル形式
                </h3>
                <p className="text-gray-600">{document.mimeType}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  作成日
                </h3>
                <p className="text-gray-600">{formatDate(document.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview section for PDFs or images */}
        {(document.mimeType.startsWith("image/") ||
          document.mimeType === "application/pdf") && (
          <Card>
            <CardHeader>
              <CardTitle>プレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              {document.mimeType.startsWith("image/") ? (
                <img
                  src={document.fileUrl}
                  alt={document.title}
                  className="max-w-full h-auto rounded-lg"
                />
              ) : document.mimeType === "application/pdf" ? (
                <iframe
                  src={document.fileUrl}
                  className="w-full h-96 rounded-lg"
                  title={document.title}
                />
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
