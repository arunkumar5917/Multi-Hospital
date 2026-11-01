import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Eye,
  Trash2,
  Upload,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  User,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export interface PatientProfilePhotoProps {
  grn: string;
  fullName: string;
  photoUrl?: string | null;
  onPhotoUpdated?: (newPhotoUrl: string | null) => void;
  canEdit?: boolean;
  className?: string;
}

export const PatientProfilePhoto: React.FC<PatientProfilePhotoProps> = ({
  grn,
  fullName,
  photoUrl,
  onPhotoUpdated,
  canEdit = true,
  className = "",
}) => {
  const { apiFetch } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(photoUrl || null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showConfirmUploadModal, setShowConfirmUploadModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Staged upload data
  const [stagedFile, setStagedFile] = useState<{
    file: Blob;
    previewUrl: string;
    originalName: string;
    originalSize: number;
    compressedSize: number;
    dimensions: { originalW: number; originalH: number; finalW: number; finalH: number };
  } | null>(null);

  // Sync prop changes
  useEffect(() => {
    setCurrentPhoto(photoUrl || null);
    setImageLoadError(false);
  }, [photoUrl]);

  // Client-side validation, 500x500 center-crop, and compression before upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setErrorMsg("");
    setSuccessMsg("");

    // 1. Validate file extension and MIME type: JPG, JPEG, PNG, WebP
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const extMatch = file.name.match(/\.(jpe?g|png|webp)$/i);
    if (!validTypes.includes(file.type) && !extMatch) {
      setErrorMsg("Invalid file type. Supported formats: JPG, JPEG, PNG, and WebP.");
      return;
    }

    // 2. Maximum upload size: 2 MB
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE) {
      setErrorMsg(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum upload limit of 2 MB.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processAndCompressTo500x500(file);
      setStagedFile({
        file: result.blob,
        previewUrl: result.dataUrl,
        originalName: file.name,
        originalSize: file.size,
        compressedSize: result.blob.size,
        dimensions: result.dimensions,
      });
      setShowConfirmUploadModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas processing: center crop square and export exactly 500 x 500 px
  const processAndCompressTo500x500 = (
    file: File
  ): Promise<{
    blob: Blob;
    dataUrl: string;
    dimensions: { originalW: number; originalH: number; finalW: number; finalH: number };
  }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement("canvas");
        const TARGET_SIZE = 500;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to initialize canvas processing context."));
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Center crop calculation to 1:1 square
        const origW = img.naturalWidth;
        const origH = img.naturalHeight;
        const minSide = Math.min(origW, origH);
        const sx = (origW - minSide) / 2;
        const sy = (origH - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET_SIZE, TARGET_SIZE);

        // Determine output format & quality for compression
        const outputFormat = file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality = outputFormat === "image/png" ? undefined : 0.88;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed."));
              return;
            }
            const dataUrl = canvas.toDataURL(outputFormat, quality);
            resolve({
              blob,
              dataUrl,
              dimensions: {
                originalW: origW,
                originalH: origH,
                finalW: TARGET_SIZE,
                finalH: TARGET_SIZE,
              },
            });
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read image file. Please verify the file is not corrupted."));
      };

      img.src = objectUrl;
    });
  };

  // Perform backend upload and update PostgreSQL
  const handleConfirmUpload = async () => {
    if (!stagedFile) return;

    setIsUploading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      const filename = stagedFile.originalName.replace(/\.[^.]+$/, ".jpg");
      formData.append("file", stagedFile.file, filename);

      const res = await apiFetch(`/api/v1/patients/${encodeURIComponent(grn)}/photo`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUrl = data.photo_url || stagedFile.previewUrl;
        setCurrentPhoto(updatedUrl);
        setImageLoadError(false);
        setSuccessMsg("Profile photo updated successfully (500 × 500 px).");
        setShowConfirmUploadModal(false);
        setStagedFile(null);
        if (onPhotoUpdated) onPhotoUpdated(updatedUrl);
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to upload profile photo.");
      }
    } catch {
      setErrorMsg("Network error occurred while uploading photograph.");
    } finally {
      setIsUploading(false);
    }
  };

  // Remove photo and reset to default avatar in PostgreSQL
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setErrorMsg("");

    try {
      const res = await apiFetch(`/api/v1/patients/${encodeURIComponent(grn)}/photo`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCurrentPhoto(null);
        setImageLoadError(false);
        setSuccessMsg("Profile photograph removed. Default avatar restored.");
        setShowDeleteConfirmModal(false);
        if (onPhotoUpdated) onPhotoUpdated(null);
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to remove profile photo.");
      }
    } catch {
      setErrorMsg("Network error occurred while removing photograph.");
    } finally {
      setIsDeleting(false);
    }
  };

  const hasCustomPhoto = !!currentPhoto && !imageLoadError;
  const initial = (fullName ? fullName[0] : "P").toUpperCase();

  return (
    <div className={`patient-photo-component-wrapper ${className}`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
      />

      {/* 120 × 120 px Circular Profile Image Frame */}
      <div className="patient-photo-circle-frame" title={fullName}>
        {hasCustomPhoto ? (
          <img
            src={currentPhoto!}
            alt={fullName}
            className="patient-photo-circle-img"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <div className="patient-photo-default-avatar" aria-label="Default Avatar">
            <div className="default-avatar-graphic">
              <span className="default-avatar-initial">{initial}</span>
              <div className="default-avatar-badge">
                <User size={13} />
              </div>
            </div>
          </div>
        )}

        {/* Processing / Loading Overlay */}
        {(isProcessing || isUploading || isDeleting) && (
          <div className="photo-loading-overlay">
            <RefreshCw size={22} className="spin-icon" />
          </div>
        )}
      </div>

      {/* Responsive Interactive Controls: Upload, Preview, Change, Remove */}
      {canEdit && (
        <div className="patient-photo-action-buttons">
          {!hasCustomPhoto ? (
            <button
              type="button"
              className="photo-btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUploading}
              title="Upload profile photo (Max 2 MB, 500×500 px)"
            >
              <Upload size={13} />
              <span>Upload Photo</span>
            </button>
          ) : (
            <div className="photo-btn-group">
              <button
                type="button"
                className="photo-btn-icon"
                onClick={() => setShowPreviewModal(true)}
                title="Preview photo (500 × 500 px)"
              >
                <Eye size={13} />
                <span>View</span>
              </button>

              <button
                type="button"
                className="photo-btn-icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isUploading}
                title="Change photo (Max 2 MB, 500×500 px)"
              >
                <Camera size={13} />
                <span>Change</span>
              </button>

              <button
                type="button"
                className="photo-btn-icon danger"
                onClick={() => setShowDeleteConfirmModal(true)}
                disabled={isDeleting}
                title="Remove photo & restore default avatar"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {errorMsg && (
        <div className="photo-status-notice error">
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="photo-status-notice success">
          <Check size={12} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* MODAL 1: Full-Fidelity Preview Modal */}
      {showPreviewModal && hasCustomPhoto && (
        <div className="modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content medium-modal photo-preview-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">XORA TECHNOLOGIES / PATIENT PROFILE PHOTO</span>
                <h2>{fullName} &bull; {grn}</h2>
              </div>
              <button className="close-btn" onClick={() => setShowPreviewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body photo-preview-modal-body">
              <div className="photo-preview-grid">
                {/* 500 x 500 Hi-Res Display */}
                <div className="photo-preview-card">
                  <div className="photo-preview-label">
                    <span>Stored Image Dimensions</span>
                    <span className="badge-pill">500 × 500 px</span>
                  </div>
                  <div className="photo-square-500-box">
                    <img
                      src={currentPhoto!}
                      alt={fullName}
                      className="photo-square-500-img"
                    />
                  </div>
                </div>

                {/* 120 x 120 Circular Display Simulation */}
                <div className="photo-preview-card">
                  <div className="photo-preview-label">
                    <span>Display Dimensions</span>
                    <span className="badge-pill">120 × 120 px</span>
                  </div>
                  <div className="photo-circle-120-box">
                    <img
                      src={currentPhoto!}
                      alt={fullName}
                      className="patient-photo-circle-img"
                    />
                  </div>
                  <div className="photo-meta-info">
                    <p><strong>Permanent GRN:</strong> {grn}</p>
                    <p><strong>Storage:</strong> PostgreSQL Secure File Path</p>
                    <p><strong>Styling:</strong> Circular frame, <code>object-fit: cover</code>, <code>object-position: center</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                Close Preview
              </button>
              {canEdit && (
                <>
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => {
                      setShowPreviewModal(false);
                      setShowDeleteConfirmModal(true);
                    }}
                  >
                    <Trash2 size={14} /> Remove Photo
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setShowPreviewModal(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Camera size={14} /> Change Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Pre-Upload Preview & Compression Confirmation */}
      {showConfirmUploadModal && stagedFile && (
        <div className="modal-backdrop" onClick={() => setShowConfirmUploadModal(false)}>
          <div className="modal-content medium-modal photo-preview-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">XORA TECHNOLOGIES / IMAGE COMPRESSION & RESIZING</span>
                <h2>Confirm Profile Photo Upload</h2>
              </div>
              <button className="close-btn" onClick={() => setShowConfirmUploadModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body photo-preview-modal-body">
              <div className="compression-stats-banner">
                <CheckCircle2 size={18} className="text-success" />
                <div>
                  <strong>Compressed & Center-Cropped to 500 × 500 px Before Upload</strong>
                  <div className="stats-row-small">
                    <span>Original: <strong>{(stagedFile.originalSize / 1024).toFixed(0)} KB</strong> ({stagedFile.dimensions.originalW}×{stagedFile.dimensions.originalH} px)</span>
                    <span className="arrow-sep">➔</span>
                    <span>Upload: <strong>{(stagedFile.compressedSize / 1024).toFixed(0)} KB</strong> (500 × 500 px)</span>
                  </div>
                </div>
              </div>

              <div className="photo-preview-grid">
                <div className="photo-preview-card">
                  <div className="photo-preview-label">
                    <span>Upload Dimensions</span>
                    <span className="badge-pill">500 × 500 px</span>
                  </div>
                  <div className="photo-square-500-box">
                    <img
                      src={stagedFile.previewUrl}
                      alt="Staged 500x500"
                      className="photo-square-500-img"
                    />
                  </div>
                </div>

                <div className="photo-preview-card">
                  <div className="photo-preview-label">
                    <span>Display Dimensions</span>
                    <span className="badge-pill">120 × 120 px</span>
                  </div>
                  <div className="photo-circle-120-box">
                    <img
                      src={stagedFile.previewUrl}
                      alt="Circular 120x120"
                      className="patient-photo-circle-img"
                    />
                  </div>
                  <div className="photo-meta-info">
                    <p>Circular frame applied with <code>object-fit: cover</code> and <code>object-position: center</code></p>
                    <p>Supported: JPG, JPEG, PNG, WebP (Max 2 MB)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowConfirmUploadModal(false);
                  setStagedFile(null);
                }}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="spin-icon" /> Uploading 500×500 px…
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Confirm & Upload Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Remove Photo Confirmation */}
      {showDeleteConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirmModal(false)}>
          <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow text-danger">CONFIRM ACTION</span>
                <h2>Remove Profile Photograph?</h2>
              </div>
              <button className="close-btn" onClick={() => setShowDeleteConfirmModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: "0 0 12px 0", color: "var(--slate-700)" }}>
                Are you sure you want to remove the profile photograph for <strong>{fullName}</strong> ({grn})?
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--slate-500)" }}>
                The uploaded photograph file will be deleted and the record in PostgreSQL will be reset to the default healthcare avatar.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Removing…" : "Yes, Remove Photograph"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

