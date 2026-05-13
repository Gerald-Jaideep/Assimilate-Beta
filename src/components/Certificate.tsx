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
  customTextFontSize?: number;
  
  // Element offsets for existing flow elements
  titleOffset?: DraggableElement;
  awardedToOffset?: DraggableElement;
  studentNameOffset?: DraggableElement;
  reasonOffset?: DraggableElement;
  caseTitleOffset?: DraggableElement;
  cmeTextOffset?: DraggableElement;
  dateOffset?: DraggableElement;
  qrCodeOffset?: DraggableElement;
  signatureOffset?: DraggableElement;

  signatureLogoUrl?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatureScale?: number;
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
    // The parent is scaled using scale-75 on larger screens, so we adjust the offset by dividing by 0.75
    // so that the dragged distance matches the internal CSS pixel distance.
    onLayoutUpdate({
      ...layoutData,
      [element]: {
        x: currentPos.x + (info.offset.x / 0.75),
        y: currentPos.y + (info.offset.y / 0.75)
      }
    });
  };

  const DraggableContainer = ({ 
    name, 
    children, 
    className = "",
    absolute = false,
    initialPos = { x: 0, y: 0 }
  }: { 
    name: keyof CertificateLayoutData, 
    children: React.ReactNode, 
    className?: string,
    absolute?: boolean,
    initialPos?: DraggableElement
  }) => {
    const pos = (layoutData[name] as DraggableElement) || initialPos;
    const isEditing = mode === 'preview' && !!onLayoutUpdate;
    
    return (
      <motion.div
        className={`${absolute ? 'absolute' : 'relative'} ${isEditing ? 'cursor-move hover:ring-2 hover:ring-blue-400 hover:ring-dashed z-[100]' : ''} ${className}`}
        drag={isEditing}
        dragMomentum={false}
        onDragEnd={(e, info) => handleDragEnd(name, info)}
        style={{ 
          x: pos.x, 
          y: pos.y, 
          ...(absolute ? { left: 0, top: 0 } : {}) 
        }}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <div ref={containerRef} style={{ fontFamily: '"Poppins", sans-serif' }} className={`relative bg-white aspect-[1.414] overflow-hidden w-full max-w-4xl shadow-2xl`}>
      {/* Background Shapes */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#E8EDF5] rotate-[-5deg] translate-x-1/4 z-0" />
      <div className="absolute bottom-0 left-0 w-1/3 h-48 bg-[#F66B2F] rotate-[-5deg] origin-left -translate-y-12 z-0" />
      <div className="absolute bottom-0 left-0 w-2/3 h-16 bg-[#1f295b] rotate-[-5deg] origin-left translate-y-8 z-0" />
      <div className="absolute top-0 left-0 w-48 h-full bg-[#1f295b] -rotate-12 -translate-x-12 z-0" />
      <div className="absolute top-32 left-0 w-32 h-16 bg-[#F66B2F] -rotate-12 -translate-x-6 z-0" />
      <div className="absolute top-48 left-0 w-64 h-16 bg-[#E8EDF5] -rotate-12 -translate-x-2 z-0" />
      
      {/* Frame */}
      <div className="absolute inset-4 border-8 border-white shadow-[inset_0_0_0_2px_rgba(0,0,0,0.05)] bg-white z-10 flex flex-col pt-12 pb-8 px-16 text-[#333]">
        
        {/* Header line with logo */}
        <div className="flex justify-end items-center mb-6 z-20">
           {!(layoutData?.brandLogoUrl && layoutData?.brandLogoPos) && (
             <img src={layoutData?.brandLogoUrl || "https://medvarsity.com/wp-content/uploads/2023/11/logo.webp"} alt="Medvarsity Logo" className="h-10" />
           )}
           <span className="font-bold text-2xl ml-2 text-[#e31e24] flex items-center">
             <span className="text-[#a41a31] text-3xl mr-1">+</span> assimilate
           </span>
           <span className="text-[#888] ml-2 text-sm mt-1">by medvarsity</span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center z-20">
          <DraggableContainer name="titleOffset">
            <h1 className="text-4xl md:text-5xl font-black text-[#444] mb-2 tracking-widest">CERTIFICATE</h1>
          </DraggableContainer>

          <DraggableContainer name="awardedToOffset">
            <h2 className="text-xl md:text-2xl text-[#666] tracking-widest uppercase mb-10">Awarded To</h2>
          </DraggableContainer>
          
          <DraggableContainer name="studentNameOffset" className="min-w-[300px]">
            <div className="text-3xl md:text-4xl font-bold border-b border-gray-300 pb-2 mb-8">
              {studentName || 'Student Name'}
            </div>
          </DraggableContainer>

          <DraggableContainer name="reasonOffset">
            <p className="text-[#555] italic text-lg mb-2">
              for attending case discussion on
            </p>
          </DraggableContainer>

          <DraggableContainer name="caseTitleOffset">
            <div className="font-bold text-xl text-[#333] mb-2 max-w-[80%] mx-auto line-clamp-2">
              {caseTitle || 'Case Discussion Title'}
            </div>
          </DraggableContainer>

          <DraggableContainer name="cmeTextOffset">
            <p className="text-[#333] italic text-xs max-w-2xl mt-4 border-t pt-4">
              In support of improving patient care, this activity has been planned and implemented by Assimilate by Medvarsity. Assimilate by Medvarsity designates this educational activity for a maximum of <span className="font-bold">{cmeCredits || 0}</span> AMA PRA Category 1 Credit(s)™. Physicians should claim only the credit commensurate with the extent of their participation in the activity.
            </p>
          </DraggableContainer>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end mt-8 z-20">
          <DraggableContainer name="dateOffset">
            <div className="text-center w-48 border-t border-gray-400 pt-2">
              <span className="text-sm font-semibold text-[#555] uppercase tracking-wider">{date || 'DATE'}</span>
            </div>
          </DraggableContainer>
          
          <DraggableContainer name="qrCodeOffset" className="flex flex-col items-center">
            {layoutData?.sponsorLogoUrl && !layoutData?.sponsorLogoPos && (
              <img src={layoutData.sponsorLogoUrl} alt="Sponsor Logo" className="h-12 object-contain mb-4" />
            )}
            <div className="bg-white p-2 border border-gray-200 rounded">
               <QRCodeSVG value={qrCodeUrl || 'https://assimilate.one'} size={80} />
            </div>
            <span className="text-[8px] text-gray-400 mt-1 uppercase">Scan to Verify</span>
          </DraggableContainer>

          <DraggableContainer name="signatureOffset">
            <div className="text-center w-56 flex flex-col items-center">
              <div 
                className="mb-1 flex justify-center items-end" 
                style={{ 
                  height: 48 * (layoutData.signatureScale || 1),
                  transformOrigin: 'bottom center'
                }}
              >
                {layoutData?.signatureLogoUrl ? (
                  <img src={layoutData.signatureLogoUrl} alt="Signature" className="h-full object-contain" />
                ) : (
                  <svg viewBox="0 0 200 50" className="h-full w-auto opacity-70">
                    <path d="M 10 40 Q 30 10 50 20 T 70 30 T 90 20 T 110 30 T 130 15 T 150 40" stroke="#000" strokeWidth="2" fill="none" />
                    <path d="M 60 40 L 160 30" stroke="#000" strokeWidth="1" fill="none" />
                  </svg>
                )}
              </div>
              <div className="w-full border-t border-gray-400 pt-2">
                <div className="text-sm font-bold text-[#444]">{layoutData?.signatoryName || 'GERALD JAIDEEP'}</div>
                <div className="text-[10px] text-[#888] uppercase tracking-wider">{layoutData?.signatoryDesignation || 'CEO - MEDVARSITY'}</div>
              </div>
            </div>
          </DraggableContainer>
        </div>

        {mode === 'preview' && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-30">
             <div className="text-[120px] font-black text-black/5 -rotate-12 max-w-[200%] text-center leading-none">
               SAMPLE SAMPLE SAMPLE SAMPLE SAMPLE
             </div>
           </div>
        )}

        {/* Draggable Dynamic Elements (Absolute) */}
        {layoutData?.brandLogoUrl && layoutData?.brandLogoPos && (
          <DraggableContainer name="brandLogoPos" absolute initialPos={{ x: 50, y: 50 }}>
            <img src={layoutData.brandLogoUrl} alt="Brand Logo" className="h-12 object-contain pointer-events-none" />
          </DraggableContainer>
        )}
        
        {layoutData?.sponsorLogoUrl && layoutData?.sponsorLogoPos && (
          <DraggableContainer name="sponsorLogoPos" absolute initialPos={{ x: 150, y: 50 }}>
            <img src={layoutData.sponsorLogoUrl} alt="Sponsor Logo" className="h-16 object-contain pointer-events-none" />
          </DraggableContainer>
        )}
        
        {layoutData?.customText && layoutData?.customTextPos && (
          <DraggableContainer name="customTextPos" absolute initialPos={{ x: 200, y: 200 }}>
            <div className="text-[#333] font-bold whitespace-pre-wrap text-center pointer-events-none" style={{ fontSize: layoutData.customTextFontSize || 18 }}>
              {layoutData.customText}
            </div>
          </DraggableContainer>
        )}
      </div>
    </div>
  );
}
