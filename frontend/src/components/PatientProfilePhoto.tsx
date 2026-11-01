import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Eye,
  Trash2,
  Upload,
  X,
  AlertCircle,
  RefreshCw,
  User,
  CheckCircle2,
} from "lucide-react";
import { API_URL, useAuth } from "../context/AuthContext";

export const resolvePhotoUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // If running in development with relative path or Vite proxy
  if (typeof window !== "undefined" && (!API_URL || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return cleanPath;
  }
  return `${API_URL}${cleanPath}`;
};

export interface PatientProfilePhotoProps {
  grn: string;
  fullName: string;
  photoUrl?: string | null;
  onPhotoUpdated?: (newPhotoUrl: string | null) => void;
  canEdit?: boolean;
  className?: string;
  size?: "small" | "medium" | "large";
}

export const PatientProfilePhoto: React.FC<PatientProfilePhotoProps> = ({
  grn,
  fullName,
  photoUrl,
  onPhotoUpdated,
  canEdit = true,
  className = "",
  size = "medium",
}) => {
  const { user, apiFetch } = useAuth();
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
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setCurrentPhoto(photoUrl || null);
    setImageLoadError(false);
  }, [photoUrl]);

  // Client-side validation, 500x500 center-crop, compression, and direct upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setErrorMsg("");
    setSuccessMsg("");

    // 1. Validate file extension or MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    const extMatch = file.name.match(/\.(jpe?g|png|webp|gif)$/i);
    if (!validTypes.includes(file.type.toLowerCase()) && !extMatch && !file.type.startsWith("image/")) {
      setErrorMsg("Supported photo formats: JPG, JPEG, PNG, and WebP.");
      return;
    }

    // 2. Maximum original upload size: 15 MB
    const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_ORIGINAL_SIZE) {
      setErrorMsg(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds limit of 15 MB.`
      );
      return;
    }

    setIsProcessing(true);
    setIsUploading(true);

    try {
      // Compress and center-crop to 500 x 500 px
      const result = await processAndCompressTo500x500(file);

      // Prepare multipart form data
      const formData = new FormData();
      const ext = result.outputFormat === "image/png" ? ".png" : ".jpg";
      const safeFilename = `${(grn || "patient").replace(/[^a-zA-Z0-9_-]/g, "_")}_avatar${ext}`;
      formData.append("file", result.blob, safeFilename);

      const targetGrn =
        grn && grn.trim() && grn.trim().toLowerCase() !== "me"
          ? grn.trim()
          : (user?.grn || "me");

      const res = await apiFetch(`/api/v1/patients/${encodeURIComponent(targetGrn)}/photo`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUrl = data.photo_url || result.dataUrl;
        setCurrentPhoto(updatedUrl);
        setImageLoadError(false);
        setSuccessMsg("Photo updated successfully!");
        if (onPhotoUpdated) onPhotoUpdated(updatedUrl);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || "Failed to upload profile photo.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error occurred while uploading photograph.");
    } finally {
      setIsProcessing(false);
      setIsUploading(false);
    }
  };

  // Canvas processing: center crop square and export exactly 500 x 500 px
  const processAndCompressTo500x500 = (
    file: File
  ): Promise<{
    blob: Blob;
    dataUrl: string;
    outputFormat: string;
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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Center crop calculation to 1:1 square
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const minSide = Math.min(origW, origH);
        const sx = (origW - minSide) / 2;
        const sy = (origH - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET_SIZE, TARGET_SIZE);

        const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        const outputFormat = isPng ? "image/png" : "image/jpeg";
        const quality = isPng ? undefined : 0.88;

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
              outputFormat,
            });
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read image file. Please verify it is a valid photograph."));
      };

      img.src = objectUrl;
    });
  };

  // Remove photo and reset to default avatar in PostgreSQL
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setErrorMsg("");

    try {
      const targetGrn =
        grn && grn.trim() && grn.trim().toLowerCase() !== "me"
          ? grn.trim()
          : (user?.grn || "me");

      const res = await apiFetch(`/api/v1/patients/${encodeURIComponent(targetGrn)}/photo`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCurrentPhoto(null);
        setImageLoadError(false);
        setSuccessMsg("Profile photo removed. Default avatar restored.");
        setShowDeleteConfirmModal(false);
        if (onPhotoUpdated) onPhotoUpdated(null);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || "Failed to remove profile photo.");
      }
    } catch {
      setErrorMsg("Network error occurred while removing photograph.");
    } finally {
      setIsDeleting(false);
    }
  };

  const resolvedPhotoSrc = resolvePhotoUrl(currentPhoto);
  const hasCustomPhoto = !!currentPhoto && !!resolvedPhotoSrc && !imageLoadError;
  const initial = (fullName ? fullName[0] : "P").toUpperCase();

  const sizeClass = size === "small" ? "size-small" : size === "large" ? "size-large" : "";

  return (
    <div className={`patient-photo-component-wrapper ${sizeClass} ${className}`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/*"
        style={{ display: "none" }}
      />

      {/* Circular Profile Image Frame */}
      <div
        className={`patient-photo-circle-frame ${canEdit ? "can-edit" : ""}`}
        title={canEdit ? "Click to upload or change profile photo" : fullName}
        onClick={() => {
          if (canEdit && !isProcessing && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
      >
        {hasCustomPhoto ? (
          <img
            src={resolvedPhotoSrc}
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

        {/* Hover Camera Overlay when editable */}
        {canEdit && !isProcessing && !isUploading && (
          <div className="photo-camera-overlay">
            <Camera size={18} />
            <span>{hasCustomPhoto ? "Change" : "Upload"}</span>
          </div>
        )}

        {/* Processing / Loading Overlay */}
        {(isProcessing || isUploading || isDeleting) && (
          <div className="photo-loading-overlay">
            <RefreshCw size={22} className="spin-icon" />
          </div>
        )}
      </div>

      {/* Interactive Controls: Upload, Preview, Change, Remove */}
      {canEdit && (
        <div className="patient-photo-action-buttons">
          {!hasCustomPhoto ? (
            <button
              type="button"
              className="photo-btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUploading}
              title="Upload profile photo (JPG, PNG, WebP)"
            >
              <Upload size={13} />
              <span>{isUploading ? "Uploading…" : "Upload Photo"}</span>
            </button>
          ) : (
            <div className="photo-btn-group">
              <button
                type="button"
                className="photo-btn-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreviewModal(true);
                }}
                title="Preview photo (500 × 500 px)"
              >
                <Eye size={13} />
                <span>View</span>
              </button>
              <button
                type="button"
                className="photo-btn-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isProcessing || isUploading}
                title="Change photo"
              >
                <Camera size={13} />
                <span>Change</span>
              </button>
              <button
                type="button"
                className="photo-btn-icon text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirmModal(true);
                }}
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

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="photo-status-notice error">
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="photo-status-notice success">
          <CheckCircle2 size={12} />
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
                      src={resolvedPhotoSrc}
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
                      src={resolvedPhotoSrc}
                      alt={fullName}
                      className="patient-photo-circle-img"
                    />
                  </div>
                  <div className="photo-meta-info">
                    <p><strong>Permanent GRN:</strong> {grn}</p>
                    <p><strong>Storage:</strong> PostgreSQL Secure File Path</p>
                    <p><strong>Styling:</strong> Circular frame, <code>object-fit: cover</code></p>
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

      {/* MODAL 2: Remove Photo Confirmation */}
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
                The photograph file will be deleted and your profile will be reset to the default healthcare avatar.
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
