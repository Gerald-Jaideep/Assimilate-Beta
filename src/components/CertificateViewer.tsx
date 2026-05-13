import React, { useRef, useState } from 'react';
import { Certificate } from './Certificate';
import { Download, Share2, Printer, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export function CertificateViewer(props: any) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${props.studentName.replace(/ /g, '_')}_Certificate.pdf`);
      toast.success('Certificate downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download certificate.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!certRef.current) return;
    try {
      html2canvas(certRef.current, { scale: 2, useCORS: true }).then(canvas => {
         const imgData = canvas.toDataURL('image/png');
         const printWindow = window.open('', '_blank');
         if (printWindow) {
           printWindow.document.write(`<html><head><title>Print Certificate</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${imgData}" style="max-width:100%;max-height:100%;" /></body></html>`);
           printWindow.document.close();
           printWindow.focus();
           setTimeout(() => {
              printWindow.print();
              printWindow.close();
           }, 250);
         }
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to print certificate.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Certificate from Assimilate',
          text: `I just earned a certificate for ${props.caseTitle} with ${props.cmeCredits} CME credits!`,
          url: props.qrCodeUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
       navigator.clipboard.writeText(props.qrCodeUrl);
       toast.success('Certificate link copied to clipboard!');
    }
  };

  return (
    <div className="group relative">
       {/* Actions Bar - visible on hover on larger screens, always visible or tap on mobile */}
       <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2 rounded-xl shadow-lg backdrop-blur-sm">
          <button onClick={handleDownload} disabled={downloading} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors group/btn relative" aria-label="Download PDF">
            {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Download PDF</span>
          </button>
          <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors group/btn relative" aria-label="Print">
            <Printer size={20} />
             <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity">Print</span>
          </button>
          <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors group/btn relative" aria-label="Share">
            <Share2 size={20} />
             <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity">Share</span>
          </button>
       </div>

       <div ref={certRef}>
         <Certificate {...props} />
       </div>
    </div>
  );
}
