"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { createFuelReceipt } from "@/lib/services/fuel-receipt-service";
import { getVehicles } from "@/lib/services/vehicle-service";
import { getStaffs } from "@/lib/services/staff-service";
import { Vehicle, Staff } from "@/lib/types/firestore";
import { ArrowLeft, Camera, Upload, Loader2, X } from "lucide-react";
import { createWorker } from "tesseract.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NewFuelReceiptPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    liters: "",
    odometerReading: "",
    isVerified: false,
  });

  // OCR and image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [ocrData, setOcrData] = useState<{
    date?: string;
    store?: string;
    amount?: number;
    liters?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      try {
        const [vehiclesData, staffsData] = await Promise.all([
          getVehicles(admin.organizationId),
          getStaffs(admin.organizationId),
        ]);
        setVehicles(vehiclesData);
        setStaffs(staffsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [admin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle image selection and OCR
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process OCR
    await processOCR(file);
  };

  // Process OCR with Tesseract.js
  const processOCR = async (file: File) => {
    setIsProcessingOCR(true);
    setOcrResult("");
    try {
      const worker = await createWorker("jpn+eng");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      setOcrResult(text);

      // Extract data from OCR text
      const extractedData = extractReceiptData(text);
      setOcrData(extractedData);

      // Auto-fill form fields
      if (extractedData.date) {
        setFormData(prev => ({ ...prev, date: extractedData.date! }));
      }
      if (extractedData.amount) {
        setFormData(prev => ({ ...prev, amount: extractedData.amount!.toString() }));
      }
      if (extractedData.liters) {
        setFormData(prev => ({ ...prev, liters: extractedData.liters!.toString() }));
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setError("OCR処理に失敗しました。手動で入力してください。");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Extract receipt data from OCR text
  const extractReceiptData = (text: string) => {
    const data: {
      date?: string;
      store?: string;
      amount?: number;
      liters?: number;
    } = {};

    // Extract date (YYYY/MM/DD or YYYY-MM-DD)
    const dateMatch = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, "0");
      const day = dateMatch[3].padStart(2, "0");
      data.date = `${year}-${month}-${day}`;
    }

    // Extract amount (金額)
    const amountMatch = text.match(/[金額|合計|計].*?[¥￥]?\s*([0-9,]+)/i);
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // Extract liters (リットル or L)
    const litersMatch = text.match(/([0-9.]+)\s*[LlＬｌリットル]/);
    if (litersMatch) {
      data.liters = parseFloat(litersMatch[1]);
    }

    return data;
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setOcrResult("");
    setOcrData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!admin) {
      setError("管理者情報が取得できません");
      return;
    }

    if (!formData.vehicleId || !formData.staffId || !formData.amount || !formData.liters) {
      setError("必須項目を入力してください");
      return;
    }

    setLoading(true);

    try {
      // Upload image to Firebase Storage if selected
      let receiptImageUrl = "";
      if (selectedImage) {
        const storage = getStorage();
        const fileName = `fuel-receipts/${admin.organizationId}/${Date.now()}_${selectedImage.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, selectedImage);
        receiptImageUrl = await getDownloadURL(storageRef);
      }

      await createFuelReceipt({
        organizationId: admin.organizationId,
        vehicleId: formData.vehicleId,
        staffId: formData.staffId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        liters: parseFloat(formData.liters),
        odometerReading: formData.odometerReading
          ? parseFloat(formData.odometerReading)
          : null,
        receiptImageUrl,
        ocrData: ocrData ? {
          rawText: ocrResult,
          extractedData: ocrData,
        } : null,
        isVerified: formData.isVerified,
      });

      router.push("/fuel");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/fuel")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">ガソリンレシート登録</h1>
          <p className="text-gray-600 mt-1">給油記録を手動で登録します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>給油情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vehicleId">
                  車両 <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="vehicleId"
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="">選択してください</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.licensePlate})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffId">
                  給油者 <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="staffId"
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="">選択してください</option>
                  {staffs.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  給油日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    金額（円） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="5000"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liters">
                    給油量（L） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="liters"
                    name="liters"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="30.5"
                    value={formData.liters}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometerReading">走行距離（km）</Label>
                <Input
                  id="odometerReading"
                  name="odometerReading"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="12345"
                  value={formData.odometerReading}
                  onChange={handleChange}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  走行距離を入力すると燃費計算ができます
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isVerified"
                  checked={formData.isVerified}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isVerified: e.target.checked,
                    })
                  }
                  disabled={loading}
                />
                <Label htmlFor="isVerified" className="cursor-pointer">
                  確認済みとしてマーク
                </Label>
              </div>

              {/* Image Upload and OCR */}
              <div className="space-y-4 border-t pt-4">
                <Label>レシート画像（任意）</Label>

                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="h-12 w-12 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-blue-600">クリックして画像を選択</span>
                        <br />
                        またはドラッグ&ドロップ
                      </div>
                      <p className="text-xs text-gray-500">
                        自動的にOCRで金額・給油量を読み取ります
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="レシートプレビュー"
                        className="max-w-full h-auto rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {isProcessingOCR && (
                      <div className="flex items-center justify-center space-x-2 text-blue-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">OCR処理中...</span>
                      </div>
                    )}

                    {ocrData && !isProcessingOCR && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm font-medium text-green-800 mb-2">
                          OCR結果（自動入力済み）
                        </p>
                        <div className="text-xs text-green-700 space-y-1">
                          {ocrData.date && <p>• 日付: {ocrData.date}</p>}
                          {ocrData.amount && <p>• 金額: ¥{ocrData.amount.toLocaleString()}</p>}
                          {ocrData.liters && <p>• 給油量: {ocrData.liters}L</p>}
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          ※ 内容を確認し、必要に応じて修正してください
                        </p>
                      </div>
                    )}

                    {ocrResult && !ocrData && !isProcessingOCR && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                          OCRで情報を抽出できませんでした。手動で入力してください。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "登録中..." : "登録"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/fuel")}
                  disabled={loading}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
