// Modal düzeltmeleri
document.addEventListener('DOMContentLoaded', function() {
    // Kriter isimlerini düzenle modalı açıldığında
    document.getElementById('criteriaModal').addEventListener('show.bs.modal', function() {
        // Kriter container'ını güncelle
        updateCriteriaContainer();
    });
    
    // Kriter isimlerini kaydet butonuna tıklandığında
    document.getElementById('save-criteria').addEventListener('click', function() {
        // Kriter isimlerini güncelle
        for (let i = 0; i < criteriaNames.length; i++) {
            const input = document.getElementById(`criteria-${i + 1}`);
            if (input) {
                criteriaNames[i] = input.value.trim() || `Soru ${i + 1}`;
            }
        }
        
        // Tablo başlıklarını güncelle
        updateCriteriaHeaders();
        
        // Modalı kapat
        const criteriaModal = bootstrap.Modal.getInstance(document.getElementById('criteriaModal'));
        if (criteriaModal) {
            criteriaModal.hide();
        }
        
        // Not tablosunu yeniden oluştur
        renderGradeTable();
        
        // Bildirim göster
        showToast('Soru isimleri başarıyla güncellendi.');
    });
    
    // Analiz modalı kapatıldığında arka plan karartısını kaldır
    document.getElementById('analysisModal').addEventListener('hidden.bs.modal', function() {
        // Modal arka plan karartısını kaldır
        document.querySelector('.modal-backdrop').remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });
});
