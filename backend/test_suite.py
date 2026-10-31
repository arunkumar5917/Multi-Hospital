import os
import sys
import io

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_all_tests():
    print("=====================================================================")
    print("  X7 MediCore HMS — Comprehensive Test Suite & System Verification   ")
    print("=====================================================================")

    # 1. Hospitals List
    res = client.get("/api/v1/hospitals")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    hospitals = res.json()
    assert len(hospitals) >= 3, "Expected at least 3 seeded hospitals"
    print(f"✓ Test 1: Hospitals list retrieved ({len(hospitals)} active hospitals found)")

    # 2. Authentication - Doctor Login
    doc_login_res = client.post("/api/v1/auth/login", json={
        "identifier": "doctor@x7medicore.local",
        "password": "ChangeMe123!",
        "hospital_code": "HOSP-001",
        "portal": "staff",
    })
    assert doc_login_res.status_code == 200, f"Doctor login failed: {doc_login_res.text}"
    doc_token = doc_login_res.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    print("✓ Test 2: Doctor login authenticated successfully (HOSP-001)")

    # 3. Authentication - Patient Login & GRN verification
    pat_login_res = client.post("/api/v1/auth/login", json={
        "identifier": "patient@x7medicore.local",
        "password": "ChangeMe123!",
        "portal": "patient",
    })
    assert pat_login_res.status_code == 200, f"Patient login failed: {pat_login_res.text}"
    pat_data = pat_login_res.json()
    assert pat_data["user"]["role"] == "patient"
    assert pat_data["grn"] == "XM-GRN-000001"
    pat_token = pat_data["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    print("✓ Test 3: Patient login authenticated with permanent GRN XM-GRN-000001")

    # 4. Patient Profile Endpoint
    prof_res = client.get("/api/v1/patient/profile", headers=pat_headers)
    assert prof_res.status_code == 200, f"Profile error: {prof_res.text}"
    prof = prof_res.json()
    assert prof["grn"] == "XM-GRN-000001"
    assert prof["full_name"] == "Arun Kumar"
    print(f"✓ Test 4: Patient profile retrieved for GRN {prof['grn']}")

    # 5. Global Patient Search (by GRN, Name, and Phone)
    search_grn_res = client.get("/api/v1/patients/search?query=XM-GRN-000001", headers=doc_headers)
    assert search_grn_res.status_code == 200
    search_grn_data = search_grn_res.json()
    assert len(search_grn_data) >= 1
    assert search_grn_data[0]["grn"] == "XM-GRN-000001"

    search_name_res = client.get("/api/v1/patients/search?query=Arun", headers=doc_headers)
    assert search_name_res.status_code == 200
    assert len(search_name_res.json()) >= 1

    search_phone_res = client.get("/api/v1/patients/search?query=9876543210", headers=doc_headers)
    assert search_phone_res.status_code == 200
    assert len(search_phone_res.json()) >= 1
    print("✓ Test 5: Global Patient Search verified across GRN, Name, and Phone")

    # 6. Concurrency-Safe New Patient Registration with Auto-generated GRN
    import time
    ts = int(time.time())
    reg_res = client.post("/api/v1/patients/register", headers=doc_headers, json={
        "full_name": f"Test Patient {ts}",
        "date_of_birth": "1997-04-22",
        "gender": "Female",
        "phone": f"+91 9444{ts % 100000:05d}",
        "email": f"test_{ts}@example.com",
        "blood_group": "B+",
        "address": "42 Anna Nagar, Chennai",
        "emergency_contact": "+91 94444 66666",
        "hospital_code": "HOSP-001"
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    new_grn = reg_data["grn"]
    assert new_grn.startswith("XM-GRN-"), f"Invalid GRN format: {new_grn}"
    print(f"✓ Test 6: New patient registered with auto-generated unique GRN: {new_grn}")

    # 7. Cross-Hospital Linking & Consent
    link_res = client.post(f"/api/v1/patients/{new_grn}/link-hospital", headers=doc_headers, json={
        "hospital_code": "HOSP-002",
        "consent_status": "granted",
        "notes": "Patient authorized Bengaluru specialty care access."
    })
    assert link_res.status_code in [200, 201], f"Hospital linking failed: {link_res.text}"
    link_data = link_res.json()
    assert link_data["hospital_code"] == "HOSP-002"
    print(f"✓ Test 7: Patient {new_grn} cross-linked to facility HOSP-002 with granted consent")

    # 8. Centralized Medical History & Chronological Timeline
    med_hist_res = client.get(f"/api/v1/patients/XM-GRN-000001/medical-history", headers=doc_headers)
    assert med_hist_res.status_code == 200
    med_hist = med_hist_res.json()
    assert len(med_hist["conditions"]) >= 1, "Expected conditions on seed patient"
    assert len(med_hist["allergies"]) >= 1, "Expected allergies on seed patient"

    timeline_res = client.get(f"/api/v1/patients/XM-GRN-000001/medical-history/timeline", headers=doc_headers)
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert len(timeline) >= 2, "Expected multiple chronological timeline events"
    print(f"✓ Test 8: Centralized medical history and {len(timeline)} chronological timeline events verified")

    # 9. New Treatment Creation with Prescriptions
    new_trt_res = client.post("/api/v1/treatments", headers=doc_headers, json={
        "patient_grn": "XM-GRN-000001",
        "chief_complaint": "Persistent dry throat and mild seasonal allergy symptoms",
        "symptoms": "Sneezing, itchy eyes, mild nasal congestion",
        "clinical_observations": "Clear nasal mucosa with mild erythema, lungs clear to auscultation",
        "diagnosis": "Allergic Rhinitis",
        "description": "Administered antihistamine treatment course and advised avoiding dust triggers",
        "procedures_performed": "Anterior Rhinoscopy Examination",
        "follow_up_instructions": "Review in 2 weeks if allergic symptoms persist",
        "status": "In Progress",
        "prescriptions": [
            {
                "medication": "Cetirizine 10mg",
                "dosage": "1 tablet at bedtime",
                "instructions": "Take after dinner for 7 days"
            },
            {
                "medication": "Fluticasone Nasal Spray",
                "dosage": "1 spray per nostril daily",
                "instructions": "Use in morning"
            }
        ]
    })
    assert new_trt_res.status_code == 201, f"Treatment creation failed: {new_trt_res.text}"
    created_trt = new_trt_res.json()
    treatment_id = created_trt["id"]
    treatment_code = created_trt["treatment_code"]
    assert treatment_code.startswith("TRT-"), f"Invalid treatment code: {treatment_code}"
    assert len(created_trt["prescriptions"]) == 2, "Expected 2 prescriptions created with treatment"
    print(f"✓ Test 9: Treatment {treatment_code} created with 2 prescriptions and saved to medical history")

    # 10. Audit Trail & Clinical Notes
    note_res = client.post(f"/api/v1/treatments/{treatment_id}/notes", headers=doc_headers, json={
        "note_type": "observation",
        "note_text": "Patient reports significant symptom relief within 24 hours of antihistamine start."
    })
    assert note_res.status_code == 201, f"Note creation failed: {note_res.text}"
    print(f"✓ Test 10: Clinical observation note recorded to treatment #{treatment_id} with audit trail")

    # 11. Medical Attachment Upload & Streaming Download
    dummy_file_content = b"%PDF-1.4 simulated diagnostic report content for verification test"
    files = {
        "file": ("test_lab_report.pdf", io.BytesIO(dummy_file_content), "application/pdf")
    }
    data = {
        "patient_grn": "XM-GRN-000001",
        "file_category": "Blood Test Report",
        "description": "CBC and Allergy Panel Findings"
    }
    upload_res = client.post(f"/api/v1/treatments/{treatment_id}/attachments", headers=doc_headers, files=files, data=data)
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    attachment_data = upload_res.json()
    attachment_id = attachment_data["id"]
    print(f"✓ Test 11a: Medical document uploaded successfully (Attachment ID: {attachment_id})")

    download_res = client.get(f"/api/v1/attachments/{attachment_id}", headers=doc_headers)
    assert download_res.status_code == 200, f"Download failed: {download_res.status_code}"
    assert download_res.content == dummy_file_content, "Downloaded file content does not match uploaded file"
    print(f"✓ Test 11b: Attachment streaming download verified and byte-accurate")

    # 12. Consents and Access Audit Logs
    consents_res = client.get("/api/v1/patients/XM-GRN-000001/consents", headers=doc_headers)
    assert consents_res.status_code == 200
    assert len(consents_res.json()) >= 1, "Expected consent entries"

    access_logs_res = client.get("/api/v1/patients/XM-GRN-000001/access-logs", headers=doc_headers)
    assert access_logs_res.status_code == 200
    assert len(access_logs_res.json()) >= 1, "Expected access logs from recent reads"
    print(f"✓ Test 12: Consents and HIPAA-compliant access audit logs retrieved successfully")

    # 13. Patient Self Profile (GET & PATCH /api/v1/patients/me)
    patient_headers = {"Authorization": f"Bearer {pat_token}"}
    me_res = client.get("/api/v1/patients/me", headers=patient_headers)
    assert me_res.status_code == 200, f"Get /patients/me failed: {me_res.text}"
    me_data = me_res.json()
    assert me_data["grn"] == "XM-GRN-000001"
    assert "insurance_provider" in me_data

    patch_res = client.patch("/api/v1/patients/me", headers=patient_headers, json={
        "address": "42 Anna Salai, Chennai",
        "emergency_contact": "+91 98401 99999",
        "insurance_provider": "Star Health Insurance",
        "insurance_policy_number": "SHI-789012"
    })
    assert patch_res.status_code == 200, f"Patch /patients/me failed: {patch_res.text}"
    updated_profile = patch_res.json()
    assert updated_profile["address"] == "42 Anna Salai, Chennai"
    assert updated_profile["insurance_provider"] == "Star Health Insurance"
    print(f"✓ Test 13: Patient self-profile GET and PATCH verified (Age: {updated_profile.get('age')})")

    # 14. Patient Photo Upload, 2MB Validation, Retrieval & Deletion
    # Test rejection of files > 2 MB
    oversized_data = b"0" * (2 * 1024 * 1024 + 1024)
    oversized_file = {"file": ("huge.jpg", io.BytesIO(oversized_data), "image/jpeg")}
    rej_res = client.post("/api/v1/patients/XM-GRN-000001/photo", headers=patient_headers, files=oversized_file)
    assert rej_res.status_code == 413, f"Expected 413 for >2MB file, got {rej_res.status_code}"

    # Valid photo upload
    dummy_photo = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    photo_files = {"file": ("avatar.png", io.BytesIO(dummy_photo), "image/png")}
    photo_upload_res = client.post("/api/v1/patients/XM-GRN-000001/photo", headers=patient_headers, files=photo_files)
    assert photo_upload_res.status_code == 200, f"Photo upload failed: {photo_upload_res.text}"
    photo_data = photo_upload_res.json()
    assert "photo_url" in photo_data
    photo_get_res = client.get("/api/v1/patients/XM-GRN-000001/photo")
    assert photo_get_res.status_code == 200, f"Photo get failed: {photo_get_res.status_code}"

    # Delete photo option
    del_photo_res = client.delete("/api/v1/patients/XM-GRN-000001/photo", headers=patient_headers)
    assert del_photo_res.status_code == 200, f"Photo delete failed: {del_photo_res.text}"
    photo_get_default_res = client.get("/api/v1/patients/XM-GRN-000001/photo")
    assert photo_get_default_res.status_code == 200
    assert b"<svg" in photo_get_default_res.content  # Returns default SVG avatar
    print(f"✓ Test 14: Patient profile photo upload, 2MB size enforcement, removal, and default avatar verified")

    # 15. Health Analysis & Vitals Logging
    analysis_res = client.get("/api/v1/patients/XM-GRN-000001/health-analysis", headers=doc_headers)
    assert analysis_res.status_code == 200, f"Health analysis failed: {analysis_res.text}"
    analysis = analysis_res.json()
    assert "current_vitals" in analysis
    assert len(analysis["historical_vitals"]) >= 1
    assert len(analysis["lab_reports"]) >= 1
    print(f"✓ Test 15: Health Analysis retrieved with {len(analysis['historical_vitals'])} vital recordings and {len(analysis['lab_reports'])} lab reports")

    # 16. Log New Vitals
    new_vital_res = client.post("/api/v1/patients/XM-GRN-000001/vitals", headers=doc_headers, json={
        "blood_pressure_systolic": 122,
        "blood_pressure_diastolic": 80,
        "pulse": 72,
        "temperature": 98.6,
        "oxygen_saturation": 99,
        "respiratory_rate": 16,
        "weight_kg": 73.0,
        "height_cm": 176.0,
        "notes": "Routine morning clinical check"
    })
    assert new_vital_res.status_code == 201, f"Log vitals failed: {new_vital_res.text}"
    vital_data = new_vital_res.json()
    assert vital_data["blood_pressure_systolic"] == 122
    assert vital_data["bmi"] is not None
    print(f"✓ Test 16: New vital signs recorded with calculated BMI ({vital_data['bmi']})")

    # 17. Family Contacts Management
    fam_create_res = client.post("/api/v1/patients/XM-GRN-000001/family-contacts", headers=patient_headers, json={
        "full_name": "Kavitha Kumar",
        "relationship": "Mother",
        "phone": "+91 98401 77777",
        "email": "kavitha.k@example.com",
        "address": "42 Anna Nagar, Chennai",
        "is_emergency_contact": True,
        "is_primary": False
    })
    assert fam_create_res.status_code == 201, f"Create family contact failed: {fam_create_res.text}"
    new_fam_id = fam_create_res.json()["id"]

    fam_list_res = client.get("/api/v1/patients/XM-GRN-000001/family-contacts", headers=patient_headers)
    assert fam_list_res.status_code == 200
    assert any(c["id"] == new_fam_id for c in fam_list_res.json())

    fam_del_res = client.delete(f"/api/v1/family-contacts/{new_fam_id}", headers=patient_headers)
    assert fam_del_res.status_code == 200
    print(f"✓ Test 17: Family contact creation, listing, and deletion verified")

    # 18. QR Patient Card Generation (Pure SVG)
    qr_res = client.get("/api/v1/patients/XM-GRN-000001/qr-code")
    assert qr_res.status_code == 200
    assert qr_res.headers.get("content-type") == "image/svg+xml"
    assert b"<svg" in qr_res.content
    print(f"✓ Test 18: Vector SVG QR code generated successfully for GRN XM-GRN-000001")

    # 19. Staff Patient Profile Update (PATCH /api/v1/patients/{grn})
    staff_patch_res = client.patch("/api/v1/patients/XM-GRN-000001", headers=doc_headers, json={
        "occupation": "Senior Software Engineer",
        "marital_status": "Married",
        "national_id": "IND-AADHAAR-890123"
    })
    assert staff_patch_res.status_code == 200, f"Staff patient update failed: {staff_patch_res.text}"
    staff_updated_profile = staff_patch_res.json()
    assert staff_updated_profile["occupation"] == "Senior Software Engineer"
    assert staff_updated_profile["marital_status"] == "Married"
    assert staff_updated_profile["national_id"] == "IND-AADHAAR-890123"
    print("✓ Test 19: Doctor / Clinical Staff successfully changed patient profile biodata")

    print("=====================================================================")
    print("  ALL 19 SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! (100% OK)     ")
    print("=====================================================================")

if __name__ == "__main__":
    run_all_tests()
