import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';

interface DraggableElement {
  x: number;
  y: number;
}

export interface CertificateLayoutData {
  sponsorLogoUrl?: string;
  sponsorLogoPos?: DraggableElement;
  brandLogoUrl?: string;
  brandLogoPos?: DraggableElement;
  customText?: string;
  customTextPos?: DraggableElement;
  [key: string]: any;
}

interface CertificateProps {
  studentName: string;
  caseTitle: string;
  cmeCredits: number;
  date: string;
  qrCodeUrl: string;
  mode?: 'view' | 'preview';
  layoutData?: CertificateLayoutData;
  onLayoutUpdate?: (data: CertificateLayoutData) => void;
}

export function Certificate({ 
  studentName, 
  caseTitle, 
  cmeCredits, 
  date, 
  qrCodeUrl, 
  layoutData = {},
  onLayoutUpdate,
  mode = 'view'
}: CertificateProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (element: keyof CertificateLayoutData, info: any) => {
    if (mode !== 'preview' || !onLayoutUpdate) return;
    const currentPos = layoutData[element] as DraggableElement || { x: 0, y: 0 };
    onLayoutUpdate({
      ...layoutData,
      [element]: {
        x: currentPos.x + info.offset.x,
        y: currentPos.y + info.offset.y
      }
    });
  };

  return (
    <div ref={containerRef} style={{ fontFamily: '"Poppins", sans-serif' }} className={`relative bg-white aspect-[1.414] overflow-hidden w-full max-w-4xl shadow-2xl`}>
      {/* Background Shapes */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#E8EDF5] rotate-[-5deg] translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-1/3 h-48 bg-[#F66B2F] rotate-[-5deg] origin-left -translate-y-12" />
      <div className="absolute bottom-0 left-0 w-2/3 h-16 bg-[#1f295b] rotate-[-5deg] origin-left translate-y-8" />
      <div className="absolute top-0 left-0 w-48 h-full bg-[#1f295b] -rotate-12 -translate-x-12" />
      <div className="absolute top-32 left-0 w-32 h-16 bg-[#F66B2F] -rotate-12 -translate-x-6" />
      <div className="absolute top-48 left-0 w-64 h-16 bg-[#E8EDF5] -rotate-12 -translate-x-2" />
      
      {/* Frame */}
      <div className="absolute inset-4 border-8 border-white shadow-[inset_0_0_0_2px_rgba(0,0,0,0.05)] bg-white z-10 flex flex-col pt-12 pb-8 px-16 text-[#333]">
        
        {/* Header line with logo */}
        <div className="flex justify-end items-center mb-6">
           {!(layoutData?.brandLogoUrl && layoutData?.brandLogoPos) && (
             <img src={layoutData?.brandLogoUrl || "https://medvarsity.com/wp-content/uploads/2023/11/logo.webp"} alt="Medvarsity Logo" className="h-10" />
           )}
           <span className="font-bold text-2xl ml-2 text-[#e31e24] flex items-center">
             <span className="text-[#a41a31] text-3xl mr-1">+</span> assimilate
           </span>
           <span className="text-[#888] ml-2 text-sm mt-1">by medvarsity</span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-5xl font-black text-[#444] mb-2 tracking-widest">CERTIFICATE</h1>
          <h2 className="text-xl md:text-2xl text-[#666] tracking-widest uppercase mb-10">Awarded To</h2>
          
          <div className="text-3xl md:text-4xl font-bold border-b border-gray-300 min-w-[50%] pb-2 mb-8">
            {studentName || 'Student Name'}
          </div>

          <p className="text-[#555] italic text-lg mb-2">
            for attending case discussion on
          </p>
          <div className="font-bold text-xl text-[#333] mb-2 max-w-[80%] line-clamp-2">
            {caseTitle || 'Case Discussion Title'}
          </div>
          <p className="text-[#555] italic text-lg mb-6">
            by Assimilate by Medvarsity.
          </p>

          <p className="text-[#333] mb-1">
            Thank you for participating in the session.
          </p>
          <p className="text-[#333]">
            You have been awarded <span className="font-bold">{cmeCredits || 0}</span> CME credit points.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end mt-8">
          <div className="text-center w-48 border-t border-gray-400 pt-2">
            <span className="text-sm font-semibold text-[#555] uppercase tracking-wider">{date || 'DATE'}</span>
          </div>
          
          <div className="flex flex-col items-center">
            {layoutData?.sponsorLogoUrl && !layoutData?.sponsorLogoPos && (
              <img src={layoutData.sponsorLogoUrl} alt="Sponsor Logo" className="h-12 object-contain mb-4" />
            )}
            <div className="bg-white p-2 border border-gray-200 rounded">
               <QRCodeSVG value={qrCodeUrl || 'https://assimilate.one'} size={80} />
            </div>
            <span className="text-[8px] text-gray-400 mt-1 uppercase">Scan to Verify</span>
          </div>

          <div className="text-center w-56 flex flex-col items-center">
            {/* Signature image placeholder */}
            <div className="h-12 mb-1 opacity-70">
              <svg viewBox="0 0 200 50" className="h-full w-auto">
                 <path d="M 10 40 Q 30 10 50 20 T 70 30 T 90 20 T 110 30 T 130 15 T 150 40" stroke="#000" strokeWidth="2" fill="none" />
                 <path d="M 60 40 L 160 30" stroke="#000" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <div className="w-full border-t border-gray-400 pt-2">
              <div className="text-sm font-bold text-[#444]">GERALD JAIDEEP</div>
              <div className="text-[10px] text-[#888] uppercase tracking-wider">CEO - MEDVARSITY</div>
            </div>
          </div>
        </div>

        {mode === 'preview' && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
             <div className="text-[120px] font-black text-black/5 -rotate-12 max-w-[200%] text-center leading-none">
               SAMPLE SAMPLE SAMPLE SAMPLE SAMPLE
             </div>
           </div>
        )}

        {/* Draggable Dynamic Elements */}
        {layoutData?.brandLogoUrl && layoutData?.brandLogoPos && (
          <motion.img
            src={layoutData.brandLogoUrl}
            alt="Brand Logo"
            className="absolute h-12 object-contain cursor-move"
            drag={mode === 'preview' && !!onLayoutUpdate}
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd('brandLogoPos', info)}
            style={{ x: layoutData.brandLogoPos.x, y: layoutData.brandLogoPos.y, top: 0, left: 0 }}
          />
        )}
        {layoutData?.sponsorLogoUrl && layoutData?.sponsorLogoPos && (
          <motion.img
            src={layoutData.sponsorLogoUrl}
            alt="Sponsor Logo"
            className="absolute h-16 object-contain cursor-move"
            drag={mode === 'preview' && !!onLayoutUpdate}
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd('sponsorLogoPos', info)}
            style={{ x: layoutData.sponsorLogoPos.x, y: layoutData.sponsorLogoPos.y, top: 0, left: 0 }}
          />
        )}
        {layoutData?.customText && layoutData?.customTextPos && (
          <motion.div
            className="absolute text-[#333] font-bold whitespace-pre-wrap text-center cursor-move"
            drag={mode === 'preview' && !!onLayoutUpdate}
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd('customTextPos', info)}
            style={{ x: layoutData.customTextPos.x, y: layoutData.customTextPos.y, top: 0, left: 0, fontSize: layoutData.customTextFontSize || 18 }}
          >
            {layoutData.customText}
          </motion.div>
        )}
      </div>
    </div>
  );
}
