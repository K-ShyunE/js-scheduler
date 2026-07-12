import { useState, useRef } from "react";
import Papa from "papaparse";
import { X, UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import type { Channel, Partner } from "../../types/domain";
import { createChannel, createPartner, createSchedule } from "../../lib/api/realApi";

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingChannels: Channel[];
  existingPartners: Partner[];
}

const REQUIRED_FIELDS = [
  { key: "productName", label: "상품명", required: true },
  { key: "quantity", label: "수량", required: true },
  { key: "channelName", label: "홈쇼핑 채널명", required: true },
  { key: "partnerName", label: "공급 업체명", required: true },
  { key: "saleDate", label: "방송/판매일", required: true },
  { key: "saleStartTime", label: "시작 시간", required: true },
  { key: "shipmentDate", label: "출고일", required: false },
] as const;

type RequiredFieldKey = typeof REQUIRED_FIELDS[number]["key"];

export function MigrationModal({
  isOpen,
  onClose,
  onSuccess,
  existingChannels,
  existingPartners,
}: MigrationModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  
  const [columnMap, setColumnMap] = useState<Record<RequiredFieldKey, string>>({
    productName: "",
    quantity: "",
    channelName: "",
    partnerName: "",
    saleDate: "",
    saleStartTime: "",
    shipmentDate: "",
  });

  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);

        // Auto-detect mapping
        const newMap = { ...columnMap };
        headers.forEach((h) => {
          const norm = h.replace(/\s+/g, "");
          if (["상품명", "제품명", "품명"].includes(norm)) newMap.productName = h;
          if (["수량", "개수"].includes(norm)) newMap.quantity = h;
          if (["채널", "홈쇼핑", "채널명", "방송사"].includes(norm)) newMap.channelName = h;
          if (["업체", "공급사", "업체명", "파트너"].includes(norm)) newMap.partnerName = h;
          if (["판매일", "방송일", "날짜", "방송일자"].includes(norm)) newMap.saleDate = h;
          if (["시간", "시작시간", "방송시간"].includes(norm)) newMap.saleStartTime = h;
          if (["출고일", "출고일자", "출고"].includes(norm)) newMap.shipmentDate = h;
        });
        setColumnMap(newMap);
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      processFile(file);
    } else if (file) {
      alert("CSV 파일만 업로드 가능합니다.");
    }
  };

  const allRequiredMapped = REQUIRED_FIELDS.filter(f => f.required).every(f => !!columnMap[f.key]);

  const handleImport = async () => {
    if (!allRequiredMapped) return;
    setIsProcessing(true);
    setProgress(0);

    let successCount = 0;
    let failedCount = 0;

    // Cache to avoid recreating same channel/partner multiple times during this run
    const channelCache = new Map(existingChannels.map(c => [c.name, c.id]));
    const partnerCache = new Map(existingPartners.map(p => [p.name, p.id]));

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        const cName = row[columnMap.channelName]?.trim() || "미지정 채널";
        const pName = row[columnMap.partnerName]?.trim() || "미지정 업체";
        
        let cId = channelCache.get(cName);
        if (!cId) {
          const newChan = await createChannel(cName);
          cId = newChan.id;
          channelCache.set(cName, cId);
        }

        let pId = partnerCache.get(pName);
        if (!pId) {
          const newPart = await createPartner(pName);
          pId = newPart.id;
          partnerCache.set(pName, pId);
        }

        // Clean up date/time formats if needed. Assuming yyyy-mm-dd and HH:MM.
        let sDate = row[columnMap.saleDate]?.trim() || "";
        let sTime = row[columnMap.saleStartTime]?.trim() || "00:00";
        let shDate = columnMap.shipmentDate ? (row[columnMap.shipmentDate]?.trim() || "") : "";

        // Minimal normalization (e.g. 2026.07.10 -> 2026-07-10)
        sDate = sDate.replace(/\./g, "-").replace(/\//g, "-");
        shDate = shDate.replace(/\./g, "-").replace(/\//g, "-");

        await createSchedule({
          productName: row[columnMap.productName]?.trim() || "이름 없음",
          brandName: "",
          quantity: parseInt(row[columnMap.quantity]?.replace(/[^0-9]/g, "") || "0", 10),
          channelId: cId,
          partnerId: pId,
          saleDate: sDate,
          saleStartTime: sTime,
          saleEndTime: sTime,
          shipmentDate: shDate,
          skipSync: !syncToGoogle,
          memo: "CSV Migration",
        });

        successCount++;
      } catch (e) {
        console.error("Row import failed:", row, e);
        failedCount++;
      }
      setProgress(Math.round(((i + 1) / csvData.length) * 100));
    }

    setResults({ success: successCount, failed: failedCount });
    setIsProcessing(false);
  };

  const handleReset = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setResults(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div>
            <h3 className="text-xl font-bold text-primary">기존 데이터 마이그레이션 (CSV)</h3>
            <p className="mt-1 text-sm text-secondary">이전 시스템에서 다운로드한 엑셀/CSV 파일을 새 DB로 일괄 가져옵니다.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition">
            <X size={20} className="text-secondary" />
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-2">
          {!csvData.length ? (
            <div 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border-subtle hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className={`mx-auto mb-4 transition-colors ${isDragging ? "text-primary" : "text-secondary"}`} size={48} />
              <h4 className="text-lg font-bold text-text-heading">CSV 파일 업로드</h4>
              <p className="mt-2 text-sm text-secondary mb-6">
                구글 시트나 엑셀에서 "CSV(쉼표로 구분)" 형식으로 저장한 파일을 선택해주세요.<br/>
                첫 번째 줄(Row)은 반드시 열 이름(헤더)이어야 합니다.
              </p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                파일 선택하기
              </Button>
            </div>
          ) : results ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-soft text-primary mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-2xl font-bold text-text-heading">가져오기 완료!</h4>
              <p className="mt-2 text-secondary">
                총 {csvData.length}건 중 <strong className="text-primary">{results.success}건 성공</strong>, <strong className="text-error">{results.failed}건 실패</strong>
              </p>
              
              <div className="mt-8">
                <Button onClick={() => {
                  onSuccess();
                  onClose();
                }}>
                  닫기 및 새로고침
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-surface-container-low p-5 rounded-lg border border-border-subtle">
                <h4 className="font-bold text-sm text-text-heading flex items-center gap-2 mb-4">
                  <ArrowRight size={16} className="text-primary" /> 데이터 항목 매칭
                </h4>
                <p className="text-xs text-secondary mb-4">
                  업로드한 파일의 어떤 열(Column)을 새 시스템의 어떤 항목으로 쓸지 선택해주세요. <br/>
                  (이름이 비슷하면 자동으로 선택됩니다.)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {REQUIRED_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-xs font-bold text-secondary">
                        {field.label} {field.required && <span className="text-error">*</span>}
                      </label>
                      <select
                        className="w-full text-sm rounded border border-border p-2 bg-white"
                        value={columnMap[field.key]}
                        onChange={(e) => setColumnMap({ ...columnMap, [field.key]: e.target.value })}
                        disabled={isProcessing}
                      >
                        <option value="">-- 선택 안함 --</option>
                        {csvHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container p-5 rounded-lg border border-border-subtle flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    checked={syncToGoogle}
                    onChange={(e) => setSyncToGoogle(e.target.checked)}
                    disabled={isProcessing}
                  />
                  <span className="text-sm font-bold text-text-heading">가져오는 동시에 Google Sheets / Calendar 연동 실행하기</span>
                </label>
                <p className="text-xs text-secondary ml-7">
                  체크 해제 시 DB에만 조용히 저장됩니다. (대량 데이터의 경우 체크 해제를 권장합니다. Google API 할당량 초과 위험)
                </p>
              </div>

              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <div className="bg-surface-container px-4 py-2 border-b border-border-subtle flex justify-between items-center">
                  <span className="text-xs font-bold text-secondary">데이터 미리보기 (총 {csvData.length}건)</span>
                </div>
                <div className="overflow-x-auto max-h-[250px]">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-surface-container-low sticky top-0">
                      <tr>
                        {csvHeaders.map((h, i) => <th key={i} className="px-4 py-2 font-semibold text-secondary">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-surface-container-low">
                          {csvHeaders.map((h, j) => <td key={j} className="px-4 py-2">{row[h]}</td>)}
                        </tr>
                      ))}
                      {csvData.length > 5 && (
                        <tr>
                          <td colSpan={csvHeaders.length} className="px-4 py-4 text-center text-secondary italic">
                            ... 외 {csvData.length - 5}건
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {!results && csvData.length > 0 && (
          <div className="mt-6 border-t border-border-subtle pt-4 flex justify-between items-center">
            <Button variant="ghost" onClick={handleReset} disabled={isProcessing}>
              처음부터 다시
            </Button>
            
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">{progress}% 완료</span>
                <Button disabled className="min-w-[120px]">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  가져오는 중...
                </Button>
              </div>
            ) : (
              <Button onClick={handleImport} disabled={!allRequiredMapped}>
                일괄 가져오기 실행
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
