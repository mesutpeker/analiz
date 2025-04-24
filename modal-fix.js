// Modal düzeltmeleri
document.addEventListener('DOMContentLoaded', function() {
    // Kriter isimlerini düzenle modalı açıldığında
    document.getElementById('criteriaModal').addEventListener('show.bs.modal', function() {
        // Kriter container'ını güncelle
        updateCriteriaContainer();
    });
    
    // Kriter isimlerini kaydet butonuna tıklandığında
    document.getElementById('save-criteria').addEventListener('click', function() {
        // Kriter isimlerini güncelle - sadece displayNames için
        for (let i = 0; i < criteriaNames.length; i++) {
            const input = document.getElementById(`criteria-${i + 1}`);
            if (input) {
                // Sadece yazdırma için kullanılan displayNames'i güncelle
                displayNames[i] = input.value.trim() || `Soru ${i + 1}`;
                // criteriaNames değişkenini değiştirme - standart isimler kalsın
            }
        }
        
        // Modalı kapat
        const criteriaModal = bootstrap.Modal.getInstance(document.getElementById('criteriaModal'));
        if (criteriaModal) {
            criteriaModal.hide();
        }
        
        // Bildirim göster
        showToast('Soru isimleri başarıyla güncellendi. Değişiklikler sadece yazdırma çıktısında görünecektir.');
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
