// Global değişkenler
let debugMode = true; // Debug modunu açık bırakalım
let classesByName = {};
let currentStudents = [];
let analysisData = null;
let criteriaNames = Array.from({length: 10}, (_, i) => `Soru ${i + 1}`);
let displayNames = Array.from({length: 10}, (_, i) => `Soru ${i + 1}`); // Yazdırma için kullanılacak isimler
let currentStudentToDelete = null;
let currentCriteriaCount = 10; // Başlangıçta 10 kriter var

// Okul bilgileri
let schoolInfo = {
    schoolName: "",
    courseName: "",
    examPeriod: "",
    teacherName: ""
};

// PDF yükleme ve işleme
document.addEventListener('DOMContentLoaded', function() {
    // Debug modu
    window.debugLog = function(...args) {
        if (debugMode) {
            console.log(...args);
        }
    };
    
    // PDF yükleme butonu
    document.getElementById('load-pdf').addEventListener('click', loadPDF);
    
    // Analiz butonu
    document.getElementById('analyze-btn').addEventListener('click', analyzeGrades);
    
    // Yazdırma butonu
    document.getElementById('print-btn').addEventListener('click', preparePrint);
    
    // Sınıf ekleme butonu
    document.getElementById('add-class').addEventListener('click', addClass);
    
    // Öğrenci ekleme butonu
    document.getElementById('add-student').addEventListener('click', addStudent);
    
    // Kriter isimlerini kaydetme butonu
    document.getElementById('save-criteria').addEventListener('click', saveCriteriaNames);
    
    // Öğrenci silme onay butonu
    document.getElementById('confirm-delete-student').addEventListener('click', confirmDeleteStudent);

    // Öğrenci düzenleme kaydet butonu
    document.getElementById('save-student-edit').addEventListener('click', saveStudentEdit);

    // Kriter ekleme butonu
    document.getElementById('add-criteria-btn').addEventListener('click', addCriteria);
    
    // Okul bilgilerini kaydetme
    document.getElementById('school-name').addEventListener('input', updateSchoolInfo);
    document.getElementById('course-name').addEventListener('input', updateSchoolInfo);
    document.getElementById('exam-period').addEventListener('input', updateSchoolInfo);
    document.getElementById('teacher-name').addEventListener('input', updateSchoolInfo);
    
    // Örnek öğrenciler ekle
    addSampleStudents();
    
    // Kriter başlıklarını güncelle
    updateCriteriaHeaders();
    
    debugLog("Uygulama başlatıldı");
});

// Okul bilgilerini güncelleme
function updateSchoolInfo(event) {
    const inputId = event.target.id;
    const value = event.target.value.trim();
    
    switch(inputId) {
        case 'school-name':
            schoolInfo.schoolName = value;
            break;
        case 'course-name':
            schoolInfo.courseName = value;
            break;
        case 'exam-period':
            schoolInfo.examPeriod = value;
            break;
        case 'teacher-name':
            schoolInfo.teacherName = value;
            break;
    }
    
    debugLog("Okul bilgileri güncellendi:", schoolInfo);
}

// Örnek öğrenciler ekleme
function addSampleStudents() {
    // Örnek bir sınıf oluştur
    const className = "Örnek Sınıf";
    classesByName[className] = [];
    
    // Örnek öğrenciler
    const sampleStudents = [
        { student_no: "101", first_name: "Ali", last_name: "Yılmaz" },
        { student_no: "102", first_name: "Ayşe", last_name: "Kaya" },
        { student_no: "103", first_name: "Mehmet", last_name: "Demir" },
        { student_no: "104", first_name: "Zeynep", last_name: "Çelik" },
        { student_no: "105", first_name: "Mustafa", last_name: "Şahin" }
    ];
    
    // Öğrencileri sınıfa ekle
    sampleStudents.forEach(student => {
        classesByName[className].push(student);
    });
    
    // Öğrenci sınıf seçim listesini güncelle
    updateStudentClassSelect();
    
    // Örnek öğrencileri not tablosuna aktar
    importStudentsToPerformanceTable(className);
    
    debugLog("Örnek öğrenciler eklendi");
}

// PDF dosyasını yükleme ve işleme
async function loadPDF() {
    const fileInput = document.getElementById('pdf-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Lütfen bir PDF dosyası seçin.');
        return;
    }
    
    // Yükleme göstergesini göster
    document.getElementById('pdf-loading').classList.remove('d-none');
    
    try {
        debugLog("PDF yükleme başladı");
        
        // PDF dosyasını oku
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF.js ile PDF'i yükle
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        debugLog(`PDF yüklendi, sayfa sayısı: ${pdf.numPages}`);
        
        // PDF'den sınıf bilgilerini çıkar
        classesByName = await extractClassInfo(pdf);
        
        debugLog("Sınıf bilgileri çıkarıldı:", Object.keys(classesByName));
        
        // Sonuçları göster (modalda)
        displayClassesInModal(classesByName);
        
        // Öğrenci sınıf seçim listesini güncelle
        updateStudentClassSelect();
        
        // Modal'ı kapatmayı kaldırdık - kullanıcı sınıf butonlarını görebilsin
        
        // Başarı mesajı göster
        showToast("PDF başarıyla yüklendi ve öğrenci verileri çıkarıldı.");
        
    } catch (error) {
        console.error('PDF işleme hatası:', error);
        alert('PDF işlenirken bir hata oluştu: ' + error.message);
    } finally {
        // Yükleme göstergesini gizle
        document.getElementById('pdf-loading').classList.add('d-none');
    }
}

// Sınıfları modalda gösterme
function displayClassesInModal(classesByName) {
    // PDF yükleme modalını kullan
    const pdfModal = document.getElementById('pdfModal');
    const modalBody = pdfModal.querySelector('.modal-body');
    
    // Yükleme göstergesini gizle
    document.getElementById('pdf-loading').classList.add('d-none');
    
    // Sınıf butonları için container oluştur
    let classButtonsContainer = document.getElementById('class-buttons-container');
    
    if (!classButtonsContainer) {
        classButtonsContainer = document.createElement('div');
        classButtonsContainer.id = 'class-buttons-container';
        classButtonsContainer.className = 'class-buttons-container mt-3';
        modalBody.appendChild(classButtonsContainer);
    } else {
        classButtonsContainer.innerHTML = '';
    }
    
    if (Object.keys(classesByName).length === 0) {
        classButtonsContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                PDF'den hiçbir sınıf bilgisi çıkarılamadı.
            </div>
        `;
        return;
    }
    
    // Her sınıf için buton oluştur
    Object.keys(classesByName).forEach(className => {
        const students = classesByName[className];
        
        const classButton = document.createElement('button');
        classButton.className = 'btn btn-primary class-button';
        classButton.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${className}</span>
                <span class="badge bg-light text-dark">${students.length} öğrenci</span>
            </div>
        `;
        
        // Sınıfı yükleme butonuna olay dinleyici ekle
        classButton.addEventListener('click', () => {
            importStudentsToPerformanceTable(className);
            
            // Modalı kapat
            const modal = bootstrap.Modal.getInstance(pdfModal);
            if (modal) {
                modal.hide();
            }
        });
        
        classButtonsContainer.appendChild(classButton);
    });
    
    // Bilgi metni ekle
    const infoText = document.createElement('div');
    infoText.className = 'mt-3 small text-muted';
    infoText.innerHTML = '<i class="bi bi-info-circle me-1"></i> Sınıf butonlarına tıklayarak öğrencileri tabloya aktarabilirsiniz.';
    classButtonsContainer.appendChild(infoText);
}

// Öğrenci sınıf seçim listesini güncelleme
function updateStudentClassSelect() {
    const select = document.getElementById('student-class');
    select.innerHTML = '';
    
    if (Object.keys(classesByName).length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Önce sınıf ekleyin';
        select.appendChild(option);
        return;
    }
    
    Object.keys(classesByName).forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        select.appendChild(option);
    });
    
    debugLog("Öğrenci sınıf seçim listesi güncellendi");
}

// Sınıf ekleme
function addClass() {
    const className = document.getElementById('class-name').value.trim();
    
    if (!className) {
        alert('Lütfen bir sınıf adı girin.');
        return;
    }
    
    if (classesByName[className]) {
        alert('Bu isimde bir sınıf zaten var.');
        return;
    }
    
    // Yeni sınıfı ekle
    classesByName[className] = [];
    
    // Öğrenci sınıf seçim listesini güncelle
    updateStudentClassSelect();
    
    // Modal'ı kapat
    const classModal = bootstrap.Modal.getInstance(document.getElementById('classModal'));
    if (classModal) {
        classModal.hide();
    }
    
    // Form'u temizle
    document.getElementById('class-name').value = '';
    
    // Bildirim göster
    showToast(`"${className}" sınıfı başarıyla eklendi.`);
    
    debugLog(`Yeni sınıf eklendi: ${className}`);
}

// Öğrenci ekleme
function addStudent() {
    const className = document.getElementById('student-class').value;
    const studentNo = document.getElementById('student-no').value.trim();
    const firstName = document.getElementById('student-first-name').value.trim();
    const lastName = document.getElementById('student-last-name').value.trim();
    
    if (!className) {
        alert('Lütfen bir sınıf seçin.');
        return;
    }
    
    if (!studentNo || !firstName || !lastName) {
        alert('Lütfen tüm öğrenci bilgilerini girin.');
        return;
    }
    
    // Öğrenci numarası kontrolü
    if (classesByName[className].some(student => student.student_no === studentNo)) {
        alert('Bu öğrenci numarası zaten kullanılıyor.');
        return;
    }
    
    // Yeni öğrenciyi ekle
    classesByName[className].push({
        student_no: studentNo,
        first_name: firstName,
        last_name: lastName
    });
    
    // Öğrencileri not tablosuna aktar
    importStudentsToPerformanceTable(className);
    
    // Modal'ı kapat
    const studentModal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
    if (studentModal) {
        studentModal.hide();
    }
    
    // Form'u temizle
    document.getElementById('student-no').value = '';
    document.getElementById('student-first-name').value = '';
    document.getElementById('student-last-name').value = '';
    
    // Bildirim göster
    showToast(`"${firstName} ${lastName}" öğrencisi başarıyla eklendi.`);
    
    debugLog(`Yeni öğrenci eklendi: ${firstName} ${lastName}`);
}

// Kriter ekleme
function addCriteria() {
    if (currentCriteriaCount >= 20) {
        alert('En fazla 20 kriter ekleyebilirsiniz.');
        return;
    }
    
    currentCriteriaCount++;
    
    // Yeni kriter adını ekle
    criteriaNames.push(`Soru ${currentCriteriaCount}`);
    displayNames.push(`Soru ${currentCriteriaCount}`);
    
    // Kriter container'ını güncelle
    updateCriteriaContainer();
    
    // Öğrencilerin kriter dizilerini güncelle
    currentStudents.forEach(student => {
        if (!student.criteria[currentCriteriaCount - 1]) {
            student.criteria[currentCriteriaCount - 1] = 0;
        }
    });
    
    debugLog(`Yeni kriter eklendi: Soru ${currentCriteriaCount}`);
}

// Kriter container'ını güncelleme
function updateCriteriaContainer() {
    const container = document.getElementById('criteria-container');
    container.innerHTML = '';
    
    // İlk sütun
    const leftColumn = document.createElement('div');
    leftColumn.className = 'col-md-6';
    
    // İkinci sütun
    const rightColumn = document.createElement('div');
    rightColumn.className = 'col-md-6';
    
    // Kriterleri sütunlara dağıt
    criteriaNames.forEach((name, index) => {
        const criteriaDiv = document.createElement('div');
        criteriaDiv.className = 'mb-3';
        
        criteriaDiv.innerHTML = `
            <label for="criteria-${index + 1}" class="form-label">Soru ${index + 1}</label>
            <div class="input-group">
                <input type="text" class="form-control" id="criteria-${index + 1}" value="${name}" placeholder="Soru adı">
                ${index >= 10 ? `<button type="button" class="btn btn-outline-danger" onclick="removeCriteria(${index})">
                    <i class="bi bi-trash"></i>
                </button>` : ''}
            </div>
        `;
        
        // İlk 10 kriteri sol sütuna, diğerlerini sağ sütuna ekle
        if (index < 10) {
            leftColumn.appendChild(criteriaDiv);
        } else {
            rightColumn.appendChild(criteriaDiv);
        }
    });
    
    container.appendChild(leftColumn);
    container.appendChild(rightColumn);
    
    debugLog("Kriter container'ı güncellendi");
}

// Kriter silme
function removeCriteria(index) {
    if (currentCriteriaCount <= 10) {
        alert('İlk 10 kriteri silemezsiniz.');
        return;
    }
    
    // Kriter adını sil
    criteriaNames.splice(index, 1);
    displayNames.splice(index, 1);
    currentCriteriaCount--;
    
    // Öğrencilerin kriter dizilerini güncelle
    currentStudents.forEach(student => {
        student.criteria.splice(index, 1);
    });
    
    // Kriter container'ını güncelle
    updateCriteriaContainer();
    
    debugLog(`Kriter silindi: ${index + 1}`);
}

// Kriter isimlerini kaydetme
function saveCriteriaNames() {
    // Kriter isimlerini güncelle
    for (let i = 0; i < currentCriteriaCount; i++) {
        const input = document.getElementById(`criteria-${i + 1}`);
        if (input) {
            // Sadece yazdırma için özel ismi sakla
            displayNames[i] = input.value.trim() || `Soru ${i + 1}`;
            // Uygulama sayfasında standart isim göster - değiştirilmeyecek
            criteriaNames[i] = `Soru ${i + 1}`;
        }
    }
    
    // Modal'ı kapat
    const criteriaModal = bootstrap.Modal.getInstance(document.getElementById('criteriaModal'));
    if (criteriaModal) {
        criteriaModal.hide();
    }
    
    // Bildirim göster
    showToast('Soru isimleri başarıyla güncellendi. Değişiklikler sadece yazdırma çıktısında görünecektir.');
    
    debugLog("Soru isimleri kaydedildi:", displayNames);
}

// Tablo sütunlarını güncelleme
function updateTableColumns() {
    const table = document.getElementById('grade-table');
    if (!table) return;
    
    const headerRow = table.querySelector('thead tr');
    const rows = table.querySelectorAll('tbody tr:not(.empty-table-message)');
    
    // Mevcut kriter sütunlarını temizle
    const headerCells = headerRow.querySelectorAll('th.criteria-col');
    headerCells.forEach(cell => cell.remove());
    
    rows.forEach(row => {
        const criteriaCells = row.querySelectorAll('td.criteria-col');
        criteriaCells.forEach(cell => cell.remove());
    });
    
    // Toplam sütununu bul
    const totalHeaderCell = headerRow.querySelector('th:nth-last-child(2)');
    
    // Yeni kriter sütunlarını ekle
    criteriaNames.forEach((name, index) => {
        // Başlık hücresini ekle
        const headerCell = document.createElement('th');
        headerCell.className = 'criteria-col';
        headerCell.textContent = name;
        headerRow.insertBefore(headerCell, totalHeaderCell);
        
        // Her satıra kriter hücresi ekle
        rows.forEach(row => {
            const student = currentStudents[row.dataset.index];
            const totalCell = row.querySelector('td:nth-last-child(2)');
            
            const criteriaCell = document.createElement('td');
            criteriaCell.className = 'criteria-col';
            
            // Öğrenci nesnesinde criteria dizisini güncelle
            if (student) {
                if (!student.criteria[index]) {
                    student.criteria[index] = 0;
                }
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control criteria-input';
                input.min = 0;
                input.max = 10;
                input.value = student.criteria[index];
                input.dataset.studentIndex = row.dataset.index;
                input.dataset.criteriaIndex = index;
                
                input.addEventListener('change', function() {
                    updateStudentGrade(this);
                });
                
                criteriaCell.appendChild(input);
            }
            
            row.insertBefore(criteriaCell, totalCell);
        });
    });
    
    debugLog("Tablo sütunları güncellendi");
}

// Kriter başlıklarını güncelleme
function updateCriteriaHeaders() {
    const table = document.getElementById('grade-table');
    if (!table) return;
    
    const headers = table.querySelectorAll('thead th.criteria-col');
    
    headers.forEach((header, index) => {
        if (index < criteriaNames.length) {
            header.textContent = criteriaNames[index];
        }
    });
    
    debugLog("Kriter başlıkları güncellendi");
}

// Öğrenci düzenleme modalını gösterme
let currentStudentToEdit = null;

function showEditStudentModal(studentIndex) {
    if (studentIndex < 0 || studentIndex >= currentStudents.length) {
        console.error("Geçersiz öğrenci indeksi:", studentIndex);
        return;
    }

    const student = currentStudents[studentIndex];
    currentStudentToEdit = studentIndex;

    // Öğrenci bilgilerini form alanlarına doldur
    document.getElementById('edit-student-no').value = student.student_no;

    // Full name'i ad ve soyada ayır
    const nameParts = student.full_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    document.getElementById('edit-student-first-name').value = firstName;
    document.getElementById('edit-student-last-name').value = lastName;

    const editModal = new bootstrap.Modal(document.getElementById('editStudentModal'));
    editModal.show();

    debugLog(`Öğrenci düzenleme modalı gösteriliyor: ${student.full_name}`);
}

// Öğrenci düzenleme kaydetme
function saveStudentEdit() {
    if (currentStudentToEdit === null) return;

    const studentNo = document.getElementById('edit-student-no').value.trim();
    const firstName = document.getElementById('edit-student-first-name').value.trim();
    const lastName = document.getElementById('edit-student-last-name').value.trim();

    // Validasyon
    if (!studentNo || !firstName || !lastName) {
        alert('Lütfen tüm alanları doldurun.');
        return;
    }

    // Aynı numarada başka öğrenci var mı kontrol et (kendisi hariç)
    const existingStudent = currentStudents.find((s, index) =>
        s.student_no === studentNo && index !== currentStudentToEdit
    );

    if (existingStudent) {
        alert('Bu öğrenci numarası zaten kullanılıyor.');
        return;
    }

    const oldStudent = currentStudents[currentStudentToEdit];
    const newFullName = `${firstName} ${lastName}`;

    // currentStudents dizisini güncelle
    currentStudents[currentStudentToEdit].student_no = studentNo;
    currentStudents[currentStudentToEdit].full_name = newFullName;

    // classesByName dizisini de güncelle
    Object.keys(classesByName).forEach(className => {
        const studentInClass = classesByName[className].find(s =>
            s.student_no === oldStudent.student_no &&
            `${s.first_name} ${s.last_name}` === oldStudent.full_name
        );

        if (studentInClass) {
            studentInClass.student_no = studentNo;
            studentInClass.first_name = firstName;
            studentInClass.last_name = lastName;
        }
    });

    // Tabloyu güncelle
    renderGradeTable();

    // Modal'ı kapat
    const editModal = bootstrap.Modal.getInstance(document.getElementById('editStudentModal'));
    if (editModal) {
        editModal.hide();
    }

    // Bildirim göster
    showToast(`"${newFullName}" öğrencisinin bilgileri başarıyla güncellendi.`);

    // Düzenleme işlemini sıfırla
    currentStudentToEdit = null;

    debugLog(`Öğrenci güncellendi: ${oldStudent.full_name} -> ${newFullName}`);
}

// Öğrenci silme modalını gösterme
function showDeleteStudentModal(studentIndex) {
    if (studentIndex < 0 || studentIndex >= currentStudents.length) {
        console.error("Geçersiz öğrenci indeksi:", studentIndex);
        return;
    }

    const student = currentStudents[studentIndex];
    const deleteInfo = document.getElementById('delete-student-info');

    deleteInfo.textContent = `${student.student_no} - ${student.full_name}`;
    currentStudentToDelete = studentIndex;

    const deleteModal = new bootstrap.Modal(document.getElementById('deleteStudentModal'));
    deleteModal.show();

    debugLog(`Öğrenci silme modalı gösteriliyor: ${student.full_name}`);
}

// Öğrenci silme onayı
function confirmDeleteStudent() {
    if (currentStudentToDelete === null) return;
    
    // Silinecek öğrenciyi bul
    const student = currentStudents[currentStudentToDelete];
    
    // Tüm sınıflarda ara ve sil
    Object.keys(classesByName).forEach(className => {
        classesByName[className] = classesByName[className].filter(s => 
            !(s.student_no === student.student_no && 
              s.first_name === student.first_name && 
              s.last_name === student.last_name)
        );
    });
    
    // Mevcut öğrenci listesinden sil
    currentStudents.splice(currentStudentToDelete, 1);
    
    // Tabloyu güncelle
    renderGradeTable();
    
    // Modal'ı kapat
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteStudentModal'));
    if (deleteModal) {
        deleteModal.hide();
    }
    
    // Bildirim göster
    showToast(`"${student.full_name}" öğrencisi başarıyla silindi.`);
    
    // Silme işlemini sıfırla
    currentStudentToDelete = null;
    
    debugLog(`Öğrenci silindi: ${student.full_name}`);
}

// Öğrencileri not tablosuna aktarma
function importStudentsToPerformanceTable(className) {
    if (!classesByName[className]) {
        console.error(`Sınıf bulunamadı: ${className}`);
        return;
    }
    
    // Öğrencileri al
    const students = classesByName[className];
    
    // Mevcut öğrencileri temizle
    currentStudents = [];
    
    // Öğrencileri ekle
    students.forEach(student => {
        // Öğrenci adından numara kısmını ayır
        let fullName = `${student.first_name} ${student.last_name}`;
        let studentNo = student.student_no;
        
        // Eğer ismin başında numara varsa, onu ayır
        const nameMatch = fullName.match(/^(\d+)\s+(.*)/);
        if (nameMatch) {
            studentNo = nameMatch[1];
            fullName = nameMatch[2];
        }
        
        currentStudents.push({
            student_no: studentNo,
            full_name: fullName,
            criteria: Array(currentCriteriaCount).fill(0),
            total: 0
        });
    });
    
    // Not tablosunu oluştur
    renderGradeTable();
    
    // Not dağılımı konteynerini göster
    document.getElementById('grading-container').classList.remove('d-none');
    
    debugLog(`${className} sınıfındaki ${currentStudents.length} öğrenci not tablosuna aktarıldı`);
}

// Not tablosunu oluşturma
function renderGradeTable() {
    const tableBody = document.getElementById('grade-table-body');
    tableBody.innerHTML = '';
    
    if (currentStudents.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-table-message';
        emptyRow.innerHTML = `
            <td colspan="14" class="text-center py-4">
                <i class="bi bi-exclamation-circle text-muted fs-1 d-block mb-2"></i>
                <span class="text-muted">Henüz öğrenci eklenmemiş. PDF'den yükleyin veya manuel olarak ekleyin.</span>
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    currentStudents.forEach((student, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        
        // Öğrenci No
        const cellNo = document.createElement('td');
        cellNo.textContent = student.student_no;
        row.appendChild(cellNo);
        
        // Adı Soyadı
        const cellName = document.createElement('td');
        cellName.textContent = student.full_name;
        row.appendChild(cellName);
        
        // Kriterler için hücreler
        for (let i = 0; i < criteriaNames.length; i++) {
            const cellCriteria = document.createElement('td');
            cellCriteria.className = 'criteria-col';
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-control criteria-input';
            input.min = '0';
            input.max = '10';
            input.value = student.criteria[i] || 0;
            input.dataset.studentIndex = index;
            input.dataset.criteriaIndex = i;
            input.addEventListener('change', function() {
                updateStudentGrade(this);
            });
            cellCriteria.appendChild(input);
            row.appendChild(cellCriteria);
        }
        
        // Toplam
        const cellTotal = document.createElement('td');
        const totalInput = document.createElement('input');
        totalInput.type = 'number';
        totalInput.className = 'form-control total-input';
        totalInput.min = '0';
        totalInput.step = '5';
        totalInput.value = student.total;
        totalInput.dataset.studentIndex = index;
        totalInput.dataset.rowIndex = index;
        totalInput.addEventListener('change', function() {
            distributeGradeForStudent(this);
        });
        
        // Toplam hücreleri arasında aşağı yukarı ok tuşlarıyla geçiş yapma özelliği
        totalInput.addEventListener('keydown', function(e) {
            const rowIndex = parseInt(this.dataset.rowIndex);
            
            // Aşağı ok tuşu
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextRowIndex = rowIndex + 1;
                if (nextRowIndex < currentStudents.length) {
                    const nextTotalInput = document.querySelector(`tr[data-index="${nextRowIndex}"] .total-input`);
                    if (nextTotalInput) {
                        nextTotalInput.focus();
                    }
                }
            }
            
            // Yukarı ok tuşu
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevRowIndex = rowIndex - 1;
                if (prevRowIndex >= 0) {
                    const prevTotalInput = document.querySelector(`tr[data-index="${prevRowIndex}"] .total-input`);
                    if (prevTotalInput) {
                        prevTotalInput.focus();
                    }
                }
            }
        });
        
        cellTotal.appendChild(totalInput);
        row.appendChild(cellTotal);
        
        // İşlemler
        const cellActions = document.createElement('td');

        // Düzenleme butonu
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary me-1';
        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        editBtn.title = 'Öğrenciyi Düzenle';
        editBtn.addEventListener('click', () => showEditStudentModal(index));
        cellActions.appendChild(editBtn);

        // Silme butonu
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.title = 'Öğrenciyi Sil';
        deleteBtn.addEventListener('click', () => showDeleteStudentModal(index));
        cellActions.appendChild(deleteBtn);

        row.appendChild(cellActions);
        
        tableBody.appendChild(row);
    });
    
    debugLog("Not tablosu oluşturuldu");
}

// Öğrenci notunu güncelleme
function updateStudentGrade(input) {
    const studentIndex = parseInt(input.dataset.studentIndex);
    const criteriaIndex = parseInt(input.dataset.criteriaIndex);
    const value = parseInt(input.value) || 0;
    
    // Notu güncelle
    currentStudents[studentIndex].criteria[criteriaIndex] = value;
    
    // Toplam notu hesapla
    const total = currentStudents[studentIndex].criteria.reduce((sum, grade) => sum + grade, 0);
    currentStudents[studentIndex].total = total;
    
    // Toplam hücresini güncelle
    const totalInput = document.querySelector(`tr[data-index="${studentIndex}"] .total-input`);
    if (totalInput) {
        totalInput.value = total;
    }
    
    debugLog(`Öğrenci notu güncellendi: ${studentIndex}, ${criteriaIndex}, ${value}`);
}

// Tek bir öğrenci için notları dağıtma
function distributeGradeForStudent(input) {
    const studentIndex = parseInt(input.dataset.studentIndex);
    const totalGrade = parseInt(input.value) || 0;
    
    // Öğrenci nesnesini al
    const student = currentStudents[studentIndex];
    if (!student) return;
    
    // Toplam notu güncelle
    student.total = totalGrade;
    
    // Kriterlere notları dağıt
    distributeGradeToAllCriteria(student);
    
    // Kriter inputlarını güncelle
    const criteriaInputs = document.querySelectorAll(`tr[data-index="${studentIndex}"] .criteria-input`);
    criteriaInputs.forEach((input, i) => {
        if (i < student.criteria.length) {
            input.value = student.criteria[i];
        }
    });
    
    debugLog(`Öğrenci ${studentIndex} için notlar dağıtıldı: toplam ${totalGrade}`);
}

// Toplam notu kriterlere dağıtma
function distributeGradeToAllCriteria(student) {
    const totalGrade = student.total;
    const criteriaCount = criteriaNames.length;
    
    if (criteriaCount === 0) return;
    
    // Toplam notu 0, 5 ve 10 olarak dağıt
    const baseValue = Math.floor(totalGrade / criteriaCount / 5) * 5; // 0, 5 veya 10 olabilir
    const remainingPoints = totalGrade - (baseValue * criteriaCount);
    
    // Önce tüm kriterlere temel değeri ata
    for (let i = 0; i < criteriaCount; i++) {
        student.criteria[i] = baseValue;
    }
    
    // Kalan puanları 5'er 5'er dağıt
    let remaining = remainingPoints;
    let i = 0;
    while (remaining >= 5 && i < criteriaCount) {
        student.criteria[i] += 5;
        remaining -= 5;
        i++;
    }
    
    debugLog(`Toplam not dağıtıldı: ${totalGrade}, Temel Değer: ${baseValue}, Kalan: ${remainingPoints}`);
}

// Notları analiz etme
function analyzeGrades() {
    if (currentStudents.length === 0) {
        alert('Analiz için öğrenci verisi bulunamadı.');
        return;
    }
    
    // Analiz verilerini hesapla
    analysisData = calculateAnalysisData();
    
    // Analiz modalını göster
    const analysisModal = document.getElementById('analysisModal');
    const analysisContent = document.getElementById('analysis-content');
    
    // Analiz içeriğini temizle ve mesaj göster
    analysisContent.innerHTML = `
        <div class="alert alert-success text-center">
            <i class="bi bi-check-circle-fill fs-1 d-block mb-3"></i>
            <h4>Analiz Oluşturuldu</h4>
            <p class="mb-0">Lütfen yazdır butonuna tıklayarak analiz sonuçlarını görüntüleyiniz.</p>
        </div>
    `;
    
    // Modalı göster
    const modal = new bootstrap.Modal(analysisModal);
    modal.show();
    
    // Bildirim göster
    showToast('Analiz başarıyla tamamlandı.');
    
    debugLog("Analiz tamamlandı");
}

// Analiz verilerini hesaplama
function calculateAnalysisData() {
    const data = {
        totalStudents: currentStudents.length,
        averageGrades: Array(criteriaNames.length).fill(0),
        totalAverageGrade: 0,
        highestGrades: Array(criteriaNames.length).fill(0),
        lowestGrades: Array(criteriaNames.length).fill(Number.MAX_SAFE_INTEGER),
        highestTotalGrade: 0,
        lowestTotalGrade: Number.MAX_SAFE_INTEGER,
        bestStudent: null,
        weakestStudent: null,
        gradeDistribution: {
            excellent: 0, // 85-100
            good: 0,      // 70-84
            average: 0,   // 55-69
            belowAverage: 0, // 45-54
            poor: 0       // 0-44
        },
        criteriaPerformance: Array(criteriaNames.length).fill(0), // Her kriterin performans yüzdesi
        // Yeni eklenen alanlar
        answeredStudentCount: Array(criteriaNames.length).fill(0), // Soruya cevap veren öğrenci sayısı
        unansweredStudentCount: Array(criteriaNames.length).fill(0), // Soruya cevap vermeyen öğrenci sayısı
        answerPercentage: Array(criteriaNames.length).fill(0), // Sorunun cevaplanma yüzdesi
        topicAnalysis: Array(criteriaNames.length).fill('') // Konu analizi (Anlaşılmış/Anlaşılmamış)
    };
    
    // Toplam notları hesapla
    let totalGradeSum = 0;
    
    currentStudents.forEach(student => {
        // Toplam not
        totalGradeSum += student.total;
        
        // En yüksek ve en düşük toplam not
        if (student.total > data.highestTotalGrade) {
            data.highestTotalGrade = student.total;
            data.bestStudent = student;
        }
        
        if (student.total < data.lowestTotalGrade) {
            data.lowestTotalGrade = student.total;
            data.weakestStudent = student;
        }
        
        // Her kriter için en yüksek, en düşük ve toplam notlar
        student.criteria.forEach((grade, index) => {
            if (index < criteriaNames.length) {
                data.averageGrades[index] += grade;
                
                if (grade > data.highestGrades[index]) {
                    data.highestGrades[index] = grade;
                }
                
                if (grade < data.lowestGrades[index]) {
                    data.lowestGrades[index] = grade;
                }
                
                // Soruya cevap veren/vermeyen öğrenci sayısını hesapla
                if (grade > 0) {
                    data.answeredStudentCount[index]++;
                } else {
                    data.unansweredStudentCount[index]++;
                }
            }
        });
        
        // Not dağılımı
        if (student.total >= 85) {
            data.gradeDistribution.excellent++;
        } else if (student.total >= 70) {
            data.gradeDistribution.good++;
        } else if (student.total >= 55) {
            data.gradeDistribution.average++;
        } else if (student.total >= 45) {
            data.gradeDistribution.belowAverage++;
        } else {
            data.gradeDistribution.poor++;
        }
    });
    
    // Ortalama notları hesapla
    if (data.totalStudents > 0) {
        data.totalAverageGrade = Math.round(totalGradeSum / data.totalStudents * 10) / 10;
        
        data.averageGrades = data.averageGrades.map(sum => 
            Math.round((sum / data.totalStudents) * 10) / 10
        );
        
        // Sorunun cevaplanma yüzdesini hesapla
        data.answerPercentage = data.answeredStudentCount.map(count => 
            Math.round((count / data.totalStudents) * 100)
        );
        
        // Konu analizi (Anlaşılmış/Anlaşılmamış)
        data.topicAnalysis = data.answerPercentage.map(percentage => {
            if (percentage >= 70) {
                return 'Anlaşılmış';
            } else {
                return 'Anlaşılmamış';
            }
        });
    }
    
    // Kriter performans yüzdelerini hesapla
    const maxPossibleGrade = 10; // Her kriter için maksimum 10 puan
    
    data.criteriaPerformance = data.averageGrades.map(avg => 
        Math.round((avg / maxPossibleGrade) * 100)
    );
    
    // En iyi ve en kötü öğrenci yoksa (tüm notlar 0 ise) varsayılan değerler ata
    if (!data.bestStudent && currentStudents.length > 0) {
        data.bestStudent = currentStudents[0];
    }
    
    if (!data.weakestStudent && currentStudents.length > 0) {
        data.weakestStudent = currentStudents[0];
    }
    
    debugLog("Analiz verileri hesaplandı:", data);
    
    return data;
}

// Analiz içeriğini oluşturma
function renderAnalysis(data) {
    const analysisContent = document.getElementById('analysis-content');
    analysisContent.innerHTML = '';
    
    // Genel bilgiler
    const generalSection = document.createElement('div');
    generalSection.className = 'analysis-section';
    generalSection.innerHTML = `
        <h3 class="analysis-title"><i class="bi bi-info-circle me-2"></i>Genel Bilgiler</h3>
        <div class="row">
            <div class="col-md-6">
                <div class="alert ${getPerformanceAlertClass(data.totalAverageGrade)}">
                    <h5><i class="bi bi-bar-chart-fill me-2"></i>Sınıf Ortalaması</h5>
                    <p class="display-4 mb-0">${data.totalAverageGrade} <small class="text-muted">/ 100</small></p>
                </div>
            </div>
            <div class="col-md-6">
                <div class="alert alert-light">
                    <h5><i class="bi ${getPerformanceEmoji(data.totalAverageGrade)} me-2"></i>Performans Durumu</h5>
                    <p class="h4 mb-0">${getPerformanceDescription(data.totalAverageGrade)}</p>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-3">
                <div class="card text-center mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Toplam Öğrenci</h5>
                        <p class="display-5 mb-0">${data.totalStudents}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center mb-3">
                    <div class="card-body">
                        <h5 class="card-title">En Yüksek Not</h5>
                        <p class="display-5 mb-0">${data.highestTotalGrade}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center mb-3">
                    <div class="card-body">
                        <h5 class="card-title">En Düşük Not</h5>
                        <p class="display-5 mb-0">${data.lowestTotalGrade}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Not Farkı</h5>
                        <p class="display-5 mb-0">${data.highestTotalGrade - data.lowestTotalGrade}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    analysisContent.appendChild(generalSection);
    
    // Not dağılımı
    const distributionSection = document.createElement('div');
    distributionSection.className = 'analysis-section';
    distributionSection.innerHTML = `
        <h3 class="analysis-title"><i class="bi bi-pie-chart me-2"></i>Not Dağılımı</h3>
        <div class="row">
            <div class="col-md-6">
                <div class="chart-container">
                    <canvas id="grade-distribution-chart"></canvas>
                </div>
            </div>
            <div class="col-md-6">
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Not Aralığı</th>
                            <th>Öğrenci Sayısı</th>
                            <th>Yüzde</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="text-success fw-bold">Mükemmel (85-100)</td>
                            <td>${data.gradeDistribution.excellent}</td>
                            <td>${data.totalStudents > 0 ? Math.round(data.gradeDistribution.excellent / data.totalStudents * 100) : 0}%</td>
                        </tr>
                        <tr>
                            <td class="text-info fw-bold">İyi (70-84)</td>
                            <td>${data.gradeDistribution.good}</td>
                            <td>${data.totalStudents > 0 ? Math.round(data.gradeDistribution.good / data.totalStudents * 100) : 0}%</td>
                        </tr>
                        <tr>
                            <td class="text-warning fw-bold">Orta (55-69)</td>
                            <td>${data.gradeDistribution.average}</td>
                            <td>${data.totalStudents > 0 ? Math.round(data.gradeDistribution.average / data.totalStudents * 100) : 0}%</td>
                        </tr>
                        <tr>
                            <td class="text-warning fw-bold">Ortanın Altı (45-54)</td>
                            <td>${data.gradeDistribution.belowAverage}</td>
                            <td>${data.totalStudents > 0 ? Math.round(data.gradeDistribution.belowAverage / data.totalStudents * 100) : 0}%</td>
                        </tr>
                        <tr>
                            <td class="text-danger fw-bold">Zayıf (0-44)</td>
                            <td>${data.gradeDistribution.poor}</td>
                            <td>${data.totalStudents > 0 ? Math.round(data.gradeDistribution.poor / data.totalStudents * 100) : 0}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    analysisContent.appendChild(distributionSection);
    
    // Kriter bazlı performans
    const criteriaSection = document.createElement('div');
    criteriaSection.className = 'analysis-section';
    criteriaSection.innerHTML = `
        <h3 class="analysis-title"><i class="bi bi-list-check me-2"></i>Kriter Bazlı Performans</h3>
        <div class="row">
            <div class="col-md-6">
                <div class="chart-container">
                    <canvas id="criteria-performance-chart"></canvas>
                </div>
            </div>
            <div class="col-md-6">
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Kriter</th>
                            <th>Ortalama</th>
                            <th>En Yüksek</th>
                            <th>En Düşük</th>
                            <th>Performans</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.averageGrades.map((avg, index) => `
                            <tr>
                                <td>${criteriaNames[index]}</td>
                                <td>${avg}</td>
                                <td>${data.highestGrades[index]}</td>
                                <td>${data.lowestGrades[index] === Number.MAX_SAFE_INTEGER ? 0 : data.lowestGrades[index]}</td>
                                <td>
                                    <div class="progress" style="height: 20px;">
                                        <div class="progress-bar ${getCriteriaProgressBarClass(data.criteriaPerformance[index])}" 
                                             role="progressbar" 
                                             style="width: ${data.criteriaPerformance[index]}%;" 
                                             aria-valuenow="${data.criteriaPerformance[index]}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${data.criteriaPerformance[index]}%
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    analysisContent.appendChild(criteriaSection);
    
    // Öğrenci performans analizi
    const studentAnalysisSection = document.createElement('div');
    studentAnalysisSection.className = 'analysis-section';
    
    // En iyi ve en kötü öğrenci bilgilerini kontrol et
    const bestStudentInfo = data.bestStudent ? `<strong>${data.bestStudent.full_name}</strong> (${data.highestTotalGrade} puan)` : "Veri yok";
    const weakestStudentInfo = data.weakestStudent ? `<strong>${data.weakestStudent.full_name}</strong> (${data.lowestTotalGrade} puan)` : "Veri yok";
    
    studentAnalysisSection.innerHTML = `
        <h3 class="analysis-title"><i class="bi bi-people me-2"></i>Öğrenci Performans Analizi</h3>
        <div class="row">
            <div class="col-md-12">
                <div class="alert alert-success mb-3">
                    <h5><i class="bi bi-trophy me-2"></i>En Başarılı Öğrenci</h5>
                    <p class="mb-0">${bestStudentInfo}</p>
                </div>
                
                <div class="alert alert-danger mb-3">
                    <h5><i class="bi bi-exclamation-triangle me-2"></i>En Düşük Performans Gösteren Öğrenci</h5>
                    <p class="mb-0">${weakestStudentInfo}</p>
                </div>
                
                <div class="alert alert-info mb-3">
                    <h5><i class="bi bi-lightbulb me-2"></i>Öneriler</h5>
                    <p class="mb-0">${getRecommendations(data)}</p>
                </div>
            </div>
        </div>
    `;
    analysisContent.appendChild(studentAnalysisSection);
    
    // Grafikleri oluştur
    setTimeout(() => {
        createGradeDistributionChart(data);
        createCriteriaPerformanceChart(data);
    }, 300);
    
    debugLog("Analiz içeriği oluşturuldu");
}

// Not dağılımı grafiği oluşturma
function createGradeDistributionChart(data) {
    const ctx = document.getElementById('grade-distribution-chart').getContext('2d');
    
    // Eğer önceden bir grafik varsa yok et
    if (window.gradeDistributionChart) {
        window.gradeDistributionChart.destroy();
    }
    
    window.gradeDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Mükemmel (85-100)', 'İyi (70-84)', 'Orta (55-69)', 'Ortanın Altı (45-54)', 'Zayıf (0-44)'],
            datasets: [{
                data: [
                    data.gradeDistribution.excellent,
                    data.gradeDistribution.good,
                    data.gradeDistribution.average,
                    data.gradeDistribution.belowAverage,
                    data.gradeDistribution.poor
                ],
                backgroundColor: [
                    '#28a745', // Mükemmel - Yeşil
                    '#17a2b8', // İyi - Mavi
                    '#ffc107', // Orta - Sarı
                    '#fd7e14', // Ortanın Altı - Turuncu
                    '#dc3545'  // Zayıf - Kırmızı
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
    
    debugLog("Not dağılımı grafiği oluşturuldu");
}

// Kriter performans grafiği oluşturma
function createCriteriaPerformanceChart(data) {
    const ctx = document.getElementById('criteria-performance-chart').getContext('2d');
    
    // Eğer önceden bir grafik varsa yok et
    if (window.criteriaPerformanceChart) {
        window.criteriaPerformanceChart.destroy();
    }
    
    window.criteriaPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: criteriaNames,
            datasets: [{
                label: 'Performans (%)',
                data: data.criteriaPerformance,
                backgroundColor: data.criteriaPerformance.map(perf => {
                    if (perf >= 85) return '#28a745'; // Mükemmel - Yeşil
                    if (perf >= 70) return '#17a2b8'; // İyi - Mavi
                    if (perf >= 55) return '#ffc107'; // Orta - Sarı
                    if (perf >= 45) return '#fd7e14'; // Ortanın Altı - Turuncu
                    return '#dc3545'; // Zayıf - Kırmızı
                })
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    debugLog("Kriter performans grafiği oluşturuldu");
}

// Performans açıklaması
function getPerformanceDescription(average) {
    if (average >= 85) return 'Mükemmel';
    if (average >= 70) return 'İyi';
    if (average >= 55) return 'Orta';
    if (average >= 45) return 'Ortanın Altı';
    return 'Zayıf';
}

// Performans emoji
function getPerformanceEmoji(average) {
    if (average >= 85) return 'bi-emoji-laughing';
    if (average >= 70) return 'bi-emoji-smile';
    if (average >= 55) return 'bi-emoji-neutral';
    if (average >= 45) return 'bi-emoji-frown';
    return 'bi-emoji-dizzy';
}

// Performans alert sınıfı
function getPerformanceAlertClass(average) {
    if (average >= 85) return 'alert-success';
    if (average >= 70) return 'alert-info';
    if (average >= 55) return 'alert-warning';
    if (average >= 45) return 'alert-warning';
    return 'alert-danger';
}

// Kriter progress bar sınıfı
function getCriteriaProgressBarClass(performance) {
    if (performance >= 85) return 'bg-success';
    if (performance >= 70) return 'bg-info';
    if (performance >= 55) return 'bg-warning';
    if (performance >= 45) return 'bg-warning';
    return 'bg-danger';
}

// Öneriler
function getRecommendations(data) {
    // Eğer öğrenci yoksa veya tüm notlar 0 ise
    if (data.totalStudents === 0 || data.totalAverageGrade === 0) {
        return "Henüz yeterli veri bulunmamaktadır. Öğrenci ekleyip notları dağıttıktan sonra daha detaylı öneriler alabilirsiniz.";
    }
    
    let recommendations = '';
    
    // En düşük performanslı kriterleri bul
    const lowestCriteriaIndex = data.averageGrades.indexOf(Math.min(...data.averageGrades));
    const lowestCriteriaAvg = data.averageGrades[lowestCriteriaIndex];
    
    // En yüksek performanslı kriterleri bul
    const highestCriteriaIndex = data.averageGrades.indexOf(Math.max(...data.averageGrades));
    const highestCriteriaAvg = data.averageGrades[highestCriteriaIndex];
    
    // Genel performansa göre öneriler
    if (data.totalAverageGrade < 55) {
        recommendations += 'Sınıfın genel performansı düşük seviyededir. Temel konuların tekrar edilmesi ve ek çalışmalar yapılması önerilir. ';
    } else if (data.totalAverageGrade < 70) {
        recommendations += 'Sınıfın genel performansı orta seviyededir. Eksik konuların tamamlanması ve pekiştirme çalışmaları yapılması faydalı olacaktır. ';
    } else {
        recommendations += 'Sınıfın genel performansı iyi seviyededir. Daha ileri seviye konulara geçilebilir ve mevcut bilgilerin pekiştirilmesi sağlanabilir. ';
    }
    
    // Kriter bazlı öneriler
    recommendations += `${criteriaNames[lowestCriteriaIndex]} en düşük performans gösterilen kriterdir (ortalama: ${lowestCriteriaAvg}). Bu konuda ek çalışmalar yapılması önerilir. `;
    recommendations += `${criteriaNames[highestCriteriaIndex]} en yüksek performans gösterilen kriterdir (ortalama: ${highestCriteriaAvg}). Bu alandaki başarı diğer kriterlere de yansıtılabilir.`;
    
    return recommendations;
}

// Yazdırma için hazırlık
function preparePrint() {
    if (currentStudents.length === 0) {
        alert('Yazdırma için öğrenci verisi bulunamadı.');
        return;
    }
    
    // Eğer analiz yapılmamışsa, önce analiz yap
    if (!analysisData) {
        analyzeGrades();
        // Analiz tamamlanana kadar bekle
        setTimeout(preparePrintAfterAnalysis, 500);
        return;
    }
    
    preparePrintAfterAnalysis();
}

// Analiz tamamlandıktan sonra yazdırma işlemi
function preparePrintAfterAnalysis() {
    const printArea = document.getElementById('print-area');
    const printDate = printArea.querySelector('.print-date');
    const printTable = printArea.querySelector('.print-table');
    const printAnalysis = printArea.querySelector('.print-analysis');
    
    // Tarih ve başlık bilgileri
    const now = new Date();
    const formattedDate = now.toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Sınıf adını bul - daha esnek eşleştirme
    let className = "Belirtilmemiş Sınıf";

    // Önce tam eşleşme dene
    const exactMatch = Object.keys(classesByName).find(name =>
        classesByName[name].some(s =>
            currentStudents.some(cs =>
                cs.student_no === s.student_no &&
                cs.full_name === `${s.first_name} ${s.last_name}`
            )
        )
    );

    if (exactMatch) {
        className = exactMatch;
    } else {
        // Öğrenci numarası bazında eşleştirme dene
        const numberMatch = Object.keys(classesByName).find(name =>
            classesByName[name].some(s =>
                currentStudents.some(cs => cs.student_no === s.student_no)
            )
        );

        if (numberMatch) {
            className = numberMatch;
        } else if (Object.keys(classesByName).length > 0) {
            // Son çare olarak ilk sınıfı kullan
            className = Object.keys(classesByName)[0];
        }
    }
    
    // Okul bilgilerini hazırla
    const schoolNameText = schoolInfo.schoolName ? schoolInfo.schoolName : "Okul Adı";
    const courseNameText = schoolInfo.courseName ? schoolInfo.courseName : "Ders Adı";
    const examPeriodText = schoolInfo.examPeriod ? schoolInfo.examPeriod : "Sınav Dönemi";
    const teacherNameText = schoolInfo.teacherName ? schoolInfo.teacherName : "Öğretmen Adı";
    
    // Üst bilgi
    printDate.innerHTML = `
        <div class="print-header-content">
            <div class="print-logo">
                <i class="bi bi-mortarboard-fill"></i>
            </div>
            <div class="print-title">
                <h2>${schoolNameText} - ${courseNameText}</h2>
                <div class="print-subtitle">
                    <span class="print-class">${className} - ${examPeriodText}</span>
                    <span class="print-teacher">Öğretmen: ${teacherNameText}</span>
                    <span class="print-date-time">${formattedDate}</span>
                </div>
            </div>
        </div>
        <div class="print-header-border"></div>
    `;
    
    // Özet bilgiler
    let summaryHTML = '';
    if (analysisData) {
        summaryHTML = `
            <div class="print-summary">
                <div class="print-summary-item">
                    <div class="summary-label">Toplam Öğrenci</div>
                    <div class="summary-value">${analysisData.totalStudents}</div>
                </div>
                <div class="print-summary-item">
                    <div class="summary-label">Sınıf Ortalaması</div>
                    <div class="summary-value">${analysisData.totalAverageGrade}</div>
                </div>
                <div class="print-summary-item">
                    <div class="summary-label">En Yüksek Not</div>
                    <div class="summary-value">${analysisData.highestTotalGrade}</div>
                </div>
                <div class="print-summary-item">
                    <div class="summary-label">En Düşük Not</div>
                    <div class="summary-value">${analysisData.lowestTotalGrade}</div>
                </div>
                <div class="print-summary-item">
                    <div class="summary-label">Başarı Durumu</div>
                    <div class="summary-value">${getPerformanceDescription(analysisData.totalAverageGrade)}</div>
                </div>
            </div>
        `;
    }
    
    // Tablo - Öğrenci no, ad soyad, kriter notları ve toplam notu göster
    printTable.innerHTML = `
        <div class="print-section">
            <h3 class="print-section-title">1. ÖĞRENCİ NOT TABLOSU</h3>
            ${summaryHTML}
            <table class="print-student-table">
                <thead>
                    <tr>
                        <th class="col-no">Öğrenci No</th>
                        <th class="col-name">Adı Soyadı</th>
                        ${criteriaNames.map((name, index) => `
                            <th class="col-criteria">${name}</th>
                        `).join('')}
                        <th class="col-total">Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentStudents.map((student, index) => `
                        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
                            <td class="col-no">${student.student_no}</td>
                            <td class="col-name">${student.full_name}</td>
                            ${student.criteria.map(grade => `
                                <td class="col-criteria ${getGradeColorClass(grade, 10)}">${grade}</td>
                            `).join('')}
                            <td class="col-total ${getGradeColorClass(student.total, 100)}">${student.total}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Analiz
    if (analysisData) {
        // En iyi ve en kötü öğrenci bilgilerini kontrol et
        const bestStudentInfo = analysisData.bestStudent ? `${analysisData.bestStudent.full_name} (${analysisData.highestTotalGrade} puan)` : "Veri yok";
        const weakestStudentInfo = analysisData.weakestStudent ? `${analysisData.weakestStudent.full_name} (${analysisData.lowestTotalGrade} puan)` : "Veri yok";
        
        // Kriter performans tablosu
        const criteriaTableRows = analysisData.averageGrades.map((avg, index) => `
            <tr>
                <td class="col-criteria-name">${criteriaNames[index]}</td>
                <td class="col-criteria-avg">${avg}</td>
                <td class="col-criteria-high">${analysisData.highestGrades[index]}</td>
                <td class="col-criteria-low">${analysisData.lowestGrades[index] === Number.MAX_SAFE_INTEGER ? 0 : analysisData.lowestGrades[index]}</td>
                <td class="col-criteria-perf">
                    <div class="print-progress-bar">
                        <div class="print-progress-fill ${getPerformanceColorClass(analysisData.criteriaPerformance[index])}" 
                             style="width: ${analysisData.criteriaPerformance[index]}%;">
                            ${analysisData.criteriaPerformance[index]}%
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Not dağılımı tablosu
        const distributionTable = `
            <table class="print-distribution-table">
                <thead>
                    <tr>
                        <th>Not Aralığı</th>
                        <th>Öğrenci Sayısı</th>
                        <th>Yüzde</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="grade-range excellent">Mükemmel (85-100)</td>
                        <td>${analysisData.gradeDistribution.excellent}</td>
                        <td>${analysisData.totalStudents > 0 ? Math.round(analysisData.gradeDistribution.excellent / analysisData.totalStudents * 100) : 0}%</td>
                    </tr>
                    <tr>
                        <td class="grade-range good">İyi (70-84)</td>
                        <td>${analysisData.gradeDistribution.good}</td>
                        <td>${analysisData.totalStudents > 0 ? Math.round(analysisData.gradeDistribution.good / analysisData.totalStudents * 100) : 0}%</td>
                    </tr>
                    <tr>
                        <td class="grade-range average">Orta (55-69)</td>
                        <td>${analysisData.gradeDistribution.average}</td>
                        <td>${analysisData.totalStudents > 0 ? Math.round(analysisData.gradeDistribution.average / analysisData.totalStudents * 100) : 0}%</td>
                    </tr>
                    <tr>
                        <td class="grade-range below-average">Ortanın Altı (45-54)</td>
                        <td>${analysisData.gradeDistribution.belowAverage}</td>
                        <td>${analysisData.totalStudents > 0 ? Math.round(analysisData.gradeDistribution.belowAverage / analysisData.totalStudents * 100) : 0}%</td>
                    </tr>
                    <tr>
                        <td class="grade-range poor">Zayıf (0-44)</td>
                        <td>${analysisData.gradeDistribution.poor}</td>
                        <td>${analysisData.totalStudents > 0 ? Math.round(analysisData.gradeDistribution.poor / analysisData.totalStudents * 100) : 0}%</td>
                    </tr>
                </tbody>
            </table>
        `;
        
        // Öğrenci başarı sıralaması
        const sortedStudents = [...currentStudents].sort((a, b) => b.total - a.total);
        const topStudentsRows = sortedStudents.slice(0, 5).map((student, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${student.student_no}</td>
                <td>${student.full_name}</td>
                <td class="${getGradeColorClass(student.total, 100)}">${student.total}</td>
            </tr>
        `).join('');
        
        // Detaylı analiz
        printAnalysis.innerHTML = `
            <div class="print-section">
                <h3 class="print-section-title">2. SINIF PERFORMANS ANALİZİ</h3>
                
                <div class="print-subsection">
                    <h4 class="print-subsection-title">2.1. Genel Değerlendirme</h4>
                    <div class="print-general-assessment">
                        <p>Sınıfın genel performansı <strong>${getPerformanceDescription(analysisData.totalAverageGrade)}</strong> seviyesindedir. 
                        Toplam ${analysisData.totalStudents} öğrencinin not ortalaması ${analysisData.totalAverageGrade} puandır.</p>
                        
                        <p>En başarılı öğrenci <strong>${bestStudentInfo}</strong> olurken, 
                        en düşük performans gösteren öğrenci <strong>${weakestStudentInfo}</strong> olmuştur.</p>
                        
                        <p>Sınıfın başarı dağılımı: 
                        <strong class="excellent">${analysisData.gradeDistribution.excellent}</strong> öğrenci mükemmel, 
                        <strong class="good">${analysisData.gradeDistribution.good}</strong> öğrenci iyi, 
                        <strong class="average">${analysisData.gradeDistribution.average}</strong> öğrenci orta, 
                        <strong class="below-average">${analysisData.gradeDistribution.belowAverage}</strong> öğrenci ortanın altı ve 
                        <strong class="poor">${analysisData.gradeDistribution.poor}</strong> öğrenci zayıf seviyededir.</p>
                    </div>
                </div>
                
                <div class="print-grid">
                    <div class="print-subsection">
                        <h4 class="print-subsection-title">2.2. Not Dağılımı</h4>
                        <div class="print-distribution">
                            <div class="print-chart-container">
                                <div id="print-distribution-chart-svg"></div>
                            </div>
                            <div class="print-table-container">
                                ${distributionTable}
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-subsection">
                        <h4 class="print-subsection-title">2.3. Başarı Sıralaması</h4>
                        <table class="print-ranking-table">
                            <thead>
                                <tr>
                                    <th>Sıra</th>
                                    <th>No</th>
                                    <th>Adı Soyadı</th>
                                    <th>Toplam Puan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topStudentsRows}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="print-subsection">
                    <h4 class="print-subsection-title">2.4. Kriter Bazlı Performans</h4>
                    <table class="print-criteria-table">
                        <thead>
                            <tr>
                                <th>Kriter</th>
                                <th>Ortalama</th>
                                <th>En Yüksek</th>
                                <th>En Düşük</th>
                                <th>Performans</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${criteriaTableRows}
                        </tbody>
                    </table>
                </div>
                
                <div class="print-subsection">
                    <h4 class="print-subsection-title">2.5. Değerlendirme ve Öneriler</h4>
                    <div class="print-recommendations">
                        ${getDetailedRecommendations(analysisData)}
                    </div>
                </div>
            </div>
            
            <div class="print-section">
                <h3 class="print-section-title">3. SINAVIN İSTATİSTİKSEL ANALİZİ</h3>
                
                <div class="print-subsection">
                    <div class="print-statistical-analysis">
                        <table class="print-stats-table">
                            <thead>
                                <tr>
                                    <th>İstatistik</th>
                                    <th>Değer</th>
                                    <th>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Aritmetik Ortalama</td>
                                    <td>${analysisData.totalAverageGrade.toFixed(2)}</td>
                                    <td>Sınıfın genel başarı düzeyini gösterir</td>
                                </tr>
                                <tr>
                                    <td>Medyan</td>
                                    <td>${calculateMedian(currentStudents.map(s => s.total)).toFixed(2)}</td>
                                    <td>Sınıfın orta değerini gösterir</td>
                                </tr>
                                <tr>
                                    <td>Standart Sapma</td>
                                    <td>${calculateStandardDeviation(currentStudents.map(s => s.total)).toFixed(2)}</td>
                                    <td>Notların ortalamadan ne kadar saptığını gösterir</td>
                                </tr>
                                <tr>
                                    <td>Varyans</td>
                                    <td>${calculateVariance(currentStudents.map(s => s.total)).toFixed(2)}</td>
                                    <td>Notların dağılımının ölçüsüdür</td>
                                </tr>
                                <tr>
                                    <td>Mod</td>
                                    <td>${calculateMode(currentStudents.map(s => s.total))}</td>
                                    <td>En sık tekrar eden not değeri</td>
                                </tr>
                                <tr>
                                    <td>Ranj</td>
                                    <td>${analysisData.highestTotalGrade - analysisData.lowestTotalGrade}</td>
                                    <td>En yüksek ve en düşük not arasındaki fark</td>
                                </tr>
                                <tr>
                                    <td>Çarpıklık</td>
                                    <td>${calculateSkewness(currentStudents.map(s => s.total)).toFixed(2)}</td>
                                    <td>Not dağılımının simetrisini gösterir</td>
                                </tr>
                                <tr>
                                    <td>Başarı Oranı</td>
                                    <td>${calculateSuccessRate(currentStudents.map(s => s.total), 50).toFixed(2)}%</td>
                                    <td>50 puan ve üzeri alan öğrencilerin oranı</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="print-section">
                <h3 class="print-section-title">4. SINAVIN KRİTERLERE GÖRE GENEL YORUMU</h3>
                
                <div class="print-subsection">
                    <div class="print-criteria-analysis">
                        ${generateCriteriaAnalysis(analysisData, criteriaNames)}
                    </div>
                </div>
                
                <div class="print-subsection">
                    <h4 class="print-subsection-title">4.1. Genel Değerlendirme Sonucu</h4>
                    <div class="print-general-conclusion">
                        ${generateGeneralConclusion(analysisData)}
                    </div>
                </div>
                
                <div class="print-subsection">
                    <h4 class="print-subsection-title">4.2. Öneriler</h4>
                    <div class="print-suggestions">
                        ${generateSuggestions(analysisData, criteriaNames)}
                    </div>
                </div>
            </div>
        `;
        
        // Grafikleri SVG olarak hazırla
        renderPrintCharts(analysisData);
    } else {
        printAnalysis.innerHTML = `
            <div class="print-section">
                <h3 class="print-section-title">2. SINIF PERFORMANS ANALİZİ</h3>
                <p>Analiz verisi bulunamadı. Lütfen önce "Analiz Et" butonuna tıklayın.</p>
            </div>
        `;
    }
    
    // Öğretmen imza alanı
    const printFooter = printArea.querySelector('.print-teacher-signature');
    const teacherName = schoolInfo.teacherName || "Öğretmen Adı Soyadı";

    printFooter.innerHTML = `
        <div style="margin-top: 40px;">
            <div>${teacherName}</div>
        </div>
    `;

    // Yazdırma işlemi
    setTimeout(() => {
        printArea.classList.remove('d-none');
        window.print();
        printArea.classList.add('d-none');
    }, 500);

    debugLog("Yazdırma işlemi tamamlandı");
}

// Yazdırma için grafikleri SVG olarak hazırlama
function renderPrintCharts(data) {
    // Not dağılımı grafiği (SVG olarak)
    const distributionChartSvg = document.getElementById('print-distribution-chart-svg');
    
    // SVG oluştur
    const svgContent = `
    <svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <!-- Pasta dilimi için hesaplamalar -->
        ${renderPieChart(data)}
        
        <!-- Lejant -->
        <g transform="translate(130, 20)">
            <rect x="0" y="0" width="10" height="10" fill="#28a745" />
            <text x="15" y="9" font-size="8">Mükemmel</text>
            
            <rect x="0" y="20" width="10" height="10" fill="#17a2b8" />
            <text x="15" y="29" font-size="8">İyi</text>
            
            <rect x="0" y="40" width="10" height="10" fill="#ffc107" />
            <text x="15" y="49" font-size="8">Orta</text>
            
            <rect x="0" y="60" width="10" height="10" fill="#fd7e14" />
            <text x="15" y="69" font-size="8">Ortanın Altı</text>
            
            <rect x="0" y="80" width="10" height="10" fill="#dc3545" />
            <text x="15" y="89" font-size="8">Zayıf</text>
        </g>
    </svg>
    `;
    
    distributionChartSvg.innerHTML = svgContent;
    
    debugLog("Yazdırma için grafikler hazırlandı");
}

// Pasta grafiği oluşturma
function renderPieChart(data) {
    const values = [
        data.gradeDistribution.excellent,
        data.gradeDistribution.good,
        data.gradeDistribution.average,
        data.gradeDistribution.belowAverage,
        data.gradeDistribution.poor
    ];
    
    const colors = ['#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#dc3545'];
    
    // Toplam öğrenci sayısı
    const total = values.reduce((sum, val) => sum + val, 0);
    
    // Eğer öğrenci yoksa boş bir daire göster
    if (total === 0) {
        return `<circle cx="70" cy="70" r="50" fill="#f0f0f0" stroke="#ccc" stroke-width="1" />`;
    }
    
    // Pasta dilimlerini oluştur
    let paths = '';
    let startAngle = 0;
    
    values.forEach((value, index) => {
        if (value === 0) return;
        
        const percentage = value / total;
        const endAngle = startAngle + percentage * 2 * Math.PI;
        
        // SVG path için koordinatları hesapla
        const startX = 70 + 50 * Math.cos(startAngle);
        const startY = 70 + 50 * Math.sin(startAngle);
        const endX = 70 + 50 * Math.cos(endAngle);
        const endY = 70 + 50 * Math.sin(endAngle);
        
        // Büyük yay bayrağı (1 = büyük yay, 0 = küçük yay)
        const largeArcFlag = percentage > 0.5 ? 1 : 0;
        
        // Path oluştur
        paths += `<path d="M 70 70 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z" fill="${colors[index]}" />`;
        
        startAngle = endAngle;
    });
    
    return paths;
}

// Not renk sınıfı
function getGradeColorClass(grade, maxGrade) {
    const percentage = (grade / maxGrade) * 100;
    
    if (percentage >= 85) return 'grade-excellent';
    if (percentage >= 70) return 'grade-good';
    if (percentage >= 55) return 'grade-average';
    if (percentage >= 45) return 'grade-below-average';
    return 'grade-poor';
}

// Performans renk sınıfı
function getPerformanceColorClass(performance) {
    if (performance >= 85) return 'performance-excellent';
    if (performance >= 70) return 'performance-good';
    if (performance >= 55) return 'performance-average';
    if (performance >= 45) return 'performance-below-average';
    return 'performance-poor';
}

// Detaylı öneriler
function getDetailedRecommendations(data) {
    // Eğer öğrenci yoksa veya tüm notlar 0 ise
    if (data.totalStudents === 0 || data.totalAverageGrade === 0) {
        return "<p>Henüz yeterli veri bulunmamaktadır.</p>";
    }
    
    let performanceLevel = '';
    let recommendations = '';
    
    // Performans seviyesine göre başlık ve öneriler
    if (data.totalAverageGrade >= 85) {
        performanceLevel = 'Mükemmel Performans';
        recommendations = `
            <p>Sınıfın genel performansı mükemmel seviyededir. Daha da geliştirmek için:</p>
            <ul>
                <li>Öğrencilerin ileri seviye konulara yönlendirilmesi sağlanabilir.</li>
                <li>Proje tabanlı öğrenme aktiviteleri ile yaratıcılık desteklenebilir.</li>
                <li>Akran öğretimi ile sınıf içi işbirliği güçlendirilebilir.</li>
            </ul>
        `;
    } else if (data.totalAverageGrade >= 70) {
        performanceLevel = 'İyi Performans';
        recommendations = `
            <p>Sınıfın genel performansı iyi seviyededir. Daha da geliştirmek için:</p>
            <ul>
                <li>Eksik kalan konular üzerinde ek çalışmalar yapılabilir.</li>
                <li>Bireysel öğrenme hızlarına göre farklılaştırılmış ödevler verilebilir.</li>
                <li>Grup çalışmaları ile işbirlikçi öğrenme desteklenebilir.</li>
            </ul>
        `;
    } else if (data.totalAverageGrade >= 55) {
        performanceLevel = 'Orta Performans';
        recommendations = `
            <p>Sınıfın genel performansı orta seviyededir. Geliştirmek için:</p>
            <ul>
                <li>Temel konuların tekrar edilmesi ve pekiştirilmesi sağlanabilir.</li>
                <li>Farklı öğrenme stillerine hitap eden etkinlikler düzenlenebilir.</li>
                <li>Düzenli geri bildirim ile öğrencilerin gelişimi takip edilebilir.</li>
            </ul>
        `;
    } else if (data.totalAverageGrade >= 45) {
        performanceLevel = 'Ortanın Altı Performans';
        recommendations = `
            <p>Sınıfın genel performansı ortanın altı seviyededir. Geliştirmek için:</p>
            <ul>
                <li>Öğrencilerin eksik olduğu konular belirlenerek ek çalışmalar yapılabilir.</li>
                <li>Farklı öğrenme stillerine hitap eden etkinlikler düzenlenebilir.</li>
                <li>Bireysel destek programları oluşturulabilir.</li>
            </ul>
        `;
    } else {
        performanceLevel = 'Zayıf Performans';
        recommendations = `
            <p>Sınıfın genel performansı zayıf seviyededir. Geliştirmek için:</p>
            <ul>
                <li>Öğrencilerin eksik olduğu konular belirlenerek ek çalışmalar yapılabilir.</li>
                <li>Temel kavramların tekrar edilmesi ve pekiştirilmesi sağlanabilir.</li>
                <li>Grup çalışmaları ile işbirlikçi öğrenme desteklenebilir.</li>
            </ul>
        `;
    }
    
    return `
        <h5>${performanceLevel}</h5>
        ${recommendations}
    `;
}

// Kriter analizi
function generateCriteriaAnalysis(data, criteriaNames) {
    // Eğer öğrenci yoksa veya tüm notlar 0 ise
    if (data.totalStudents === 0 || data.totalAverageGrade === 0) {
        return "<p>Henüz yeterli veri bulunmamaktadır.</p>";
    }
    
    // En düşük ve en yüksek performanslı kriterleri bul
    const lowestCriteriaIndex = data.averageGrades.indexOf(Math.min(...data.averageGrades));
    const highestCriteriaIndex = data.averageGrades.indexOf(Math.max(...data.averageGrades));
    
    return `
        <div class="print-criteria-analysis-content">
            <div class="criteria-analysis-item">
                <h5>En Yüksek Performans: ${criteriaNames[highestCriteriaIndex]}</h5>
                <p>Ortalama: ${data.averageGrades[highestCriteriaIndex]} puan</p>
                <p>Performans: ${data.criteriaPerformance[highestCriteriaIndex]}%</p>
                <p>Bu alandaki başarı diğer kriterlere de yansıtılabilir.</p>
            </div>
            
            <div class="criteria-analysis-item">
                <h5>En Düşük Performans: ${criteriaNames[lowestCriteriaIndex]}</h5>
                <p>Ortalama: ${data.averageGrades[lowestCriteriaIndex]} puan</p>
                <p>Performans: ${data.criteriaPerformance[lowestCriteriaIndex]}%</p>
                <p>Bu alanda ek çalışmalar yapılması önerilir.</p>
            </div>
        </div>
    `;
}

// Genel sonuç
function generateGeneralConclusion(data) {
    // Eğer öğrenci yoksa veya tüm notlar 0 ise
    if (data.totalStudents === 0 || data.totalAverageGrade === 0) {
        return "<p>Henüz yeterli veri bulunmamaktadır.</p>";
    }
    
    let conclusion = '';
    
    if (data.totalAverageGrade >= 85) {
        conclusion = `
            <p>Sınıfın genel performansı mükemmel seviyededir. Öğrencilerin çoğunluğu konuları iyi düzeyde kavramış ve uygulayabilmektedir. 
            Bu başarı seviyesinin korunması ve daha da geliştirilmesi için ileri seviye çalışmalar planlanabilir.</p>
        `;
    } else if (data.totalAverageGrade >= 70) {
        conclusion = `
            <p>Sınıfın genel performansı iyi seviyededir. Öğrencilerin büyük kısmı konuları kavramış durumdadır. 
            Bazı alanlarda eksiklikler olsa da genel olarak başarılı bir performans sergilenmiştir. 
            Eksik kalan konuların tamamlanması ile daha da iyi sonuçlar elde edilebilir.</p>
        `;
    } else if (data.totalAverageGrade >= 55) {
        conclusion = `
            <p>Sınıfın genel performansı orta seviyededir. Öğrencilerin bir kısmı konuları kavramış olsa da, 
            önemli eksiklikler bulunmaktadır. Temel konuların tekrar edilmesi ve pekiştirilmesi gerekmektedir.</p>
        `;
    } else if (data.totalAverageGrade >= 45) {
        conclusion = `
            <p>Sınıfın genel performansı ortanın altı seviyededir. Öğrencilerin çoğunluğunda önemli eksiklikler bulunmaktadır. 
            Temel konuların tekrar edilmesi ve ek çalışmalar yapılması gerekmektedir.</p>
        `;
    } else {
        conclusion = `
            <p>Sınıfın genel performansı zayıf seviyededir. Öğrencilerin büyük çoğunluğunda ciddi eksiklikler bulunmaktadır. 
            Temel kavramların yeniden ele alınması ve kapsamlı bir tekrar programı uygulanması gerekmektedir.</p>
        `;
    }
    
    return conclusion;
}

// Öneriler
function generateSuggestions(data, criteriaNames) {
    // Eğer öğrenci yoksa veya tüm notlar 0 ise
    if (data.totalStudents === 0 || data.totalAverageGrade === 0) {
        return "<p>Henüz yeterli veri bulunmamaktadır.</p>";
    }
    
    // En düşük performanslı kriterleri bul
    const lowestCriteriaIndex = data.averageGrades.indexOf(Math.min(...data.averageGrades));
    
    let suggestions = '';
    
    if (data.totalAverageGrade < 55) {
        suggestions = `
            <p>Sınıfın genel performansını artırmak için öneriler:</p>
            <ul>
                <li>Temel konuların tekrar edilmesi ve pekiştirilmesi</li>
                <li>Öğrencilerin eksik olduğu konuların belirlenmesi ve bu alanlara yönelik ek çalışmalar</li>
                <li>Farklı öğretim yöntemleri kullanılarak konuların daha anlaşılır hale getirilmesi</li>
                <li>Özellikle ${criteriaNames[lowestCriteriaIndex]} konusunda ek çalışmalar yapılması</li>
                <li>Düzenli tekrar ve alıştırmalarla öğrenilen bilgilerin pekiştirilmesi</li>
            </ul>
        `;
    } else if (data.totalAverageGrade < 70) {
        suggestions = `
            <p>Sınıfın performansını daha da geliştirmek için öneriler:</p>
            <ul>
                <li>Eksik kalan konuların tamamlanması</li>
                <li>Özellikle ${criteriaNames[lowestCriteriaIndex]} konusunda ek çalışmalar yapılması</li>
                <li>Grup çalışmaları ile işbirlikçi öğrenmenin desteklenmesi</li>
                <li>Farklı öğrenme stillerine hitap eden etkinlikler düzenlenmesi</li>
                <li>Düzenli geri bildirim ile öğrencilerin gelişiminin takip edilmesi</li>
            </ul>
        `;
    } else {
        suggestions = `
            <p>Sınıfın yüksek performansını sürdürmek ve daha da geliştirmek için öneriler:</p>
            <ul>
                <li>İleri seviye konulara yönlendirme</li>
                <li>Proje tabanlı öğrenme aktiviteleri ile yaratıcılığın desteklenmesi</li>
                <li>Akran öğretimi ile sınıf içi işbirliğinin güçlendirilmesi</li>
                <li>${criteriaNames[lowestCriteriaIndex]} konusunda da diğer alanlardaki başarının yakalanması için çalışmalar yapılması</li>
                <li>Öğrencilerin bireysel ilgi alanlarına yönelik derinlemesine çalışmalar yapılması</li>
            </ul>
        `;
    }
    
    return suggestions;
}

// İstatistiksel hesaplamalar
// Medyan hesaplama
function calculateMedian(values) {
    if (values.length === 0) return 0;
    
    // Değerleri sırala
    const sorted = [...values].sort((a, b) => a - b);
    
    // Ortadaki değeri bul
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
        // Çift sayıda eleman varsa, ortadaki iki değerin ortalamasını al
        return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
        // Tek sayıda eleman varsa, ortadaki değeri al
        return sorted[middle];
    }
}

// Standart sapma hesaplama
function calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    // Ortalama hesapla
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Kareler toplamı
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const sumSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0);
    
    // Standart sapma
    return Math.sqrt(sumSquaredDiff / values.length);
}

// Varyans hesaplama
function calculateVariance(values) {
    if (values.length === 0) return 0;
    
    // Ortalama hesapla
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Kareler toplamı
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const sumSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0);
    
    // Varyans
    return sumSquaredDiff / values.length;
}

// Mod hesaplama
function calculateMode(values) {
    if (values.length === 0) return 0;
    
    // Değerlerin frekansını hesapla
    const frequency = {};
    values.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
    });
    
    // En sık tekrar eden değeri bul
    let maxFreq = 0;
    let mode = 0;
    
    for (const val in frequency) {
        if (frequency[val] > maxFreq) {
            maxFreq = frequency[val];
            mode = val;
        }
    }
    
    return mode;
}

// Çarpıklık hesaplama
function calculateSkewness(values) {
    if (values.length === 0) return 0;
    
    // Ortalama hesapla
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Standart sapma hesapla
    const stdDev = calculateStandardDeviation(values);
    
    if (stdDev === 0) return 0;
    
    // Çarpıklık hesapla
    const cubedDifferences = values.map(val => Math.pow((val - mean) / stdDev, 3));
    const sumCubedDiff = cubedDifferences.reduce((sum, val) => sum + val, 0);
    
    return sumCubedDiff / values.length;
}

// Başarı oranı hesaplama
function calculateSuccessRate(values, threshold) {
    if (values.length === 0) return 0;
    
    // Eşik değerini geçen öğrenci sayısı
    const successCount = values.filter(val => val >= threshold).length;
    
    // Başarı oranı
    return (successCount / values.length) * 100;
}

// Bildirim gösterme
function showToast(message) {
    // Toast container'ı kontrol et
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Toast ID'si oluştur
    const toastId = 'toast-' + Date.now();
    
    // Toast HTML'i
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="bi bi-info-circle me-2 text-primary"></i>
                <strong class="me-auto">Bildirim</strong>
                <small>Şimdi</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Kapat"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Toast'u container'a ekle
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Toast'u göster
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    
    // Belirli bir süre sonra toast'u kaldır
    setTimeout(() => {
        toastElement.remove();
    }, 3500);
}
