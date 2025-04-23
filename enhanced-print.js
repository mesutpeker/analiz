// Geliştirilmiş yazdırma işlevleri
// Bu dosya, yazdırma çıktısını daha kurumsal, düzenli ve detaylı hale getirmek için oluşturulmuştur

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
    
    // Sınıf bilgisi
    const className = Object.keys(classesByName).find(name => 
        classesByName[name].some(s => 
            currentStudents.some(cs => 
                cs.student_no === s.student_no && 
                cs.full_name === `${s.first_name} ${s.last_name}`
            )
        )
    ) || "Belirtilmemiş Sınıf";
    
    // Üst bilgi
    printDate.innerHTML = `
        <div class="print-header-content">
            <div class="print-logo">
                <i class="bi bi-mortarboard-fill"></i>
            </div>
            <div class="print-title">
                <h2>${schoolInfo.schoolName || "Okul Adı"}</h2>
                <h3>${schoolInfo.courseName || "Ders Adı"} - ${schoolInfo.examPeriod || "Sınav Dönemi"}</h3>
                <h4>Klasik Sınav Analiz Raporu</h4>
                <div class="print-subtitle">
                    <span class="print-class">${className}</span>
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
                        ${displayNames.map((name, index) => `
                            <th class="col-criteria">${name}</th>
                        `).join('')}
                        <th class="col-total">Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentStudents.map((student, index) => {
                        // Öğrenci adından numara kısmını ayır
                        let fullName = student.full_name;
                        let studentNo = student.student_no;
                        
                        // Eğer ismin başında numara varsa, onu ayır
                        const nameMatch = fullName.match(/^(\d+)\s+(.*)/);
                        if (nameMatch) {
                            studentNo = nameMatch[1];
                            fullName = nameMatch[2];
                        }
                        
                        return `
                        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
                            <td class="col-no">${studentNo}</td>
                            <td class="col-name">${fullName}</td>
                            ${student.criteria.map(grade => `
                                <td class="col-criteria ${getGradeColorClass(grade, 10)}">${grade}</td>
                            `).join('')}
                            <td class="col-total ${getGradeColorClass(student.total, 100)}">${student.total}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Analiz
    if (analysisData) {
        // En iyi ve en kötü öğrenci bilgilerini kontrol et
        const bestStudentInfo = analysisData.bestStudent ? `${analysisData.bestStudent.full_name} (${analysisData.highestTotalGrade} puan)` : "Veri yok";
        const weakestStudentInfo = analysisData.weakestStudent ? `${analysisData.weakestStudent.full_name} (${analysisData.lowestTotalGrade} puan)` : "Veri yok";
        
        // Soru performans tablosu
        const criteriaTableRows = analysisData.averageGrades.map((avg, index) => {
            // Öğrenci adından numara kısmını ayır
            let criteriaName = displayNames[index];
            
            return `
            <tr>
                <td class="col-criteria-name">${criteriaName}</td>
                <td class="col-criteria-avg">${analysisData.answeredStudentCount[index]}</td>
                <td class="col-criteria-avg">${analysisData.unansweredStudentCount[index]}</td>
                <td class="col-criteria-avg">${analysisData.answerPercentage[index]}%</td>
                <td class="col-criteria-avg">${avg}</td>
                <td class="col-criteria-perf">
                    ${analysisData.topicAnalysis[index]}
                </td>
            </tr>
        `}).join('');
        
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
                    <h4 class="print-subsection-title">2.4. Soru Bazlı Performans</h4>
                    <table class="print-criteria-table">
                        <thead>
                            <tr>
                                <th>SORU</th>
                                <th>SORUYA CEVAP VEREN ÖĞRENCİ SAYISI</th>
                                <th>SORUYA CEVAP VERMEYEN ÖĞRENCİ SAYISI</th>
                                <th>SORUNUN CEVAPLANMA YÜZDESİ</th>
                                <th>SORUDAN ALINAN ORT. PUAN</th>
                                <th>KONU ANALİZİ</th>
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
    
    // Yazdırma işlemi
    setTimeout(() => {
        printArea.classList.remove('d-none');
        window.print();
        printArea.classList.add('d-none');
    }, 500);
    
    debugLog("Yazdırma işlemi tamamlandı");
}

// Yazdırma için grafikleri hazırlama
function renderPrintCharts(data) {
    // Not dağılımı grafiği (HTML tabanlı)
    const distributionChartSvg = document.getElementById('print-distribution-chart-svg');
    
    // Dağılım verilerini hesapla
    const total = 
        data.gradeDistribution.excellent + 
        data.gradeDistribution.good + 
        data.gradeDistribution.average + 
        data.gradeDistribution.belowAverage + 
        data.gradeDistribution.poor;
    
    if (total === 0) {
        distributionChartSvg.innerHTML = `<div style="text-align: center; padding: 20px;">Veri yok</div>`;
        return;
    }
    
    // Yüzdeleri hesapla
    const excellentPercent = Math.round(data.gradeDistribution.excellent / total * 100);
    const goodPercent = Math.round(data.gradeDistribution.good / total * 100);
    const averagePercent = Math.round(data.gradeDistribution.average / total * 100);
    const belowAveragePercent = Math.round(data.gradeDistribution.belowAverage / total * 100);
    const poorPercent = Math.round(data.gradeDistribution.poor / total * 100);
    
    // HTML tabanlı grafik oluştur - Basitleştirilmiş renkli kutular
    const chartHTML = `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; background-color: white;">
        <tr>
            <th colspan="3" style="text-align: center; font-size: 8px; padding: 3px; border-bottom: 1px solid #000;">Not Dağılımı</th>
        </tr>
        <tr>
            <td style="width: 30%; padding: 3px; font-size: 7px; text-align: right;">Mükemmel:</td>
            <td style="width: 20%; padding: 3px; font-size: 7px; text-align: center; background-color: #28a745; color: white;">${excellentPercent}%</td>
            <td style="width: 50%; padding: 3px; font-size: 7px; text-align: left;">(${data.gradeDistribution.excellent} öğrenci)</td>
        </tr>
        <tr>
            <td style="width: 30%; padding: 3px; font-size: 7px; text-align: right;">İyi:</td>
            <td style="width: 20%; padding: 3px; font-size: 7px; text-align: center; background-color: #17a2b8; color: white;">${goodPercent}%</td>
            <td style="width: 50%; padding: 3px; font-size: 7px; text-align: left;">(${data.gradeDistribution.good} öğrenci)</td>
        </tr>
        <tr>
            <td style="width: 30%; padding: 3px; font-size: 7px; text-align: right;">Orta:</td>
            <td style="width: 20%; padding: 3px; font-size: 7px; text-align: center; background-color: #ffc107; color: black;">${averagePercent}%</td>
            <td style="width: 50%; padding: 3px; font-size: 7px; text-align: left;">(${data.gradeDistribution.average} öğrenci)</td>
        </tr>
        <tr>
            <td style="width: 30%; padding: 3px; font-size: 7px; text-align: right;">Ortanın Altı:</td>
            <td style="width: 20%; padding: 3px; font-size: 7px; text-align: center; background-color: #fd7e14; color: white;">${belowAveragePercent}%</td>
            <td style="width: 50%; padding: 3px; font-size: 7px; text-align: left;">(${data.gradeDistribution.belowAverage} öğrenci)</td>
        </tr>
        <tr>
            <td style="width: 30%; padding: 3px; font-size: 7px; text-align: right;">Zayıf:</td>
            <td style="width: 20%; padding: 3px; font-size: 7px; text-align: center; background-color: #dc3545; color: white;">${poorPercent}%</td>
            <td style="width: 50%; padding: 3px; font-size: 7px; text-align: left;">(${data.gradeDistribution.poor} öğrenci)</td>
        </tr>
    </table>
    `;
    
    distributionChartSvg.innerHTML = chartHTML;
}

// Pasta grafiği oluşturma (SVG için)
function renderPieChart(data) {
    const total = 
        data.gradeDistribution.excellent + 
        data.gradeDistribution.good + 
        data.gradeDistribution.average + 
        data.gradeDistribution.belowAverage + 
        data.gradeDistribution.poor;
    
    if (total === 0) {
        return `<text x="60" y="60" text-anchor="middle" font-size="10">Veri yok</text>`;
    }
    
    const centerX = 60;
    const centerY = 60;
    const radius = 50;
    
    // Her kategori için açı hesapla
    const excellent = data.gradeDistribution.excellent / total * 360;
    const good = data.gradeDistribution.good / total * 360;
    const average = data.gradeDistribution.average / total * 360;
    const belowAverage = data.gradeDistribution.belowAverage / total * 360;
    const poor = data.gradeDistribution.poor / total * 360;
    
    // Pasta dilimlerini oluştur
    let startAngle = 0;
    let paths = '';
    
    // Mükemmel dilimi
    if (data.gradeDistribution.excellent > 0) {
        paths += createPieSlice(centerX, centerY, radius, startAngle, startAngle + excellent, '#28a745');
        startAngle += excellent;
    }
    
    // İyi dilimi
    if (data.gradeDistribution.good > 0) {
        paths += createPieSlice(centerX, centerY, radius, startAngle, startAngle + good, '#17a2b8');
        startAngle += good;
    }
    
    // Orta dilimi
    if (data.gradeDistribution.average > 0) {
        paths += createPieSlice(centerX, centerY, radius, startAngle, startAngle + average, '#ffc107');
        startAngle += average;
    }
    
    // Ortanın altı dilimi
    if (data.gradeDistribution.belowAverage > 0) {
        paths += createPieSlice(centerX, centerY, radius, startAngle, startAngle + belowAverage, '#fd7e14');
        startAngle += belowAverage;
    }
    
    // Zayıf dilimi
    if (data.gradeDistribution.poor > 0) {
        paths += createPieSlice(centerX, centerY, radius, startAngle, startAngle + poor, '#dc3545');
    }
    
    return paths;
}

// Pasta dilimi oluşturma
function createPieSlice(centerX, centerY, radius, startAngle, endAngle, fill) {
    // Açıları radyana çevir
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    // Büyük yay bayrağı (180 dereceden büyük mü?)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    // Başlangıç ve bitiş noktaları
    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);
    
    // SVG path oluştur
    return `<path d="M ${centerX},${centerY} L ${startX},${startY} A ${radius},${radius} 0 ${largeArcFlag},1 ${endX},${endY} Z" fill="${fill}" stroke="#fff" stroke-width="1" />`;
}

// Not renk sınıfı belirleme
function getGradeColorClass(grade, maxGrade) {
    const percentage = (grade / maxGrade) * 100;
    
    if (percentage >= 85) {
        return 'grade-excellent';
    } else if (percentage >= 70) {
        return 'grade-good';
    } else if (percentage >= 55) {
        return 'grade-average';
    } else if (percentage >= 45) {
        return 'grade-below-average';
    } else {
        return 'grade-poor';
    }
}

// Performans renk sınıfı belirleme
function getPerformanceColorClass(performance, textOnly = false) {
    const prefix = textOnly ? '' : 'performance-';
    
    if (performance >= 85) {
        return `${prefix}excellent`;
    } else if (performance >= 70) {
        return `${prefix}good`;
    } else if (performance >= 55) {
        return `${prefix}average`;
    } else if (performance >= 45) {
        return `${prefix}below-average`;
    } else {
        return `${prefix}poor`;
    }
}

// Performans açıklaması
function getPerformanceDescription(performance) {
    if (performance >= 85) {
        return 'Mükemmel';
    } else if (performance >= 70) {
        return 'İyi';
    } else if (performance >= 55) {
        return 'Orta';
    } else if (performance >= 45) {
        return 'Ortanın Altı';
    } else {
        return 'Zayıf';
    }
}

// Detaylı öneriler
function getDetailedRecommendations(data) {
    const avgGrade = data.totalAverageGrade;
    let recommendations = '';
    
    if (avgGrade >= 85) {
        recommendations = `
            <h5>Mükemmel Performans</h5>
            <p>Sınıfın genel performansı mükemmel seviyededir. Bu başarının sürdürülebilir olması için:</p>
            <ul>
                <li>Öğrencilerin ilgi alanlarına yönelik daha ileri düzey çalışmalar yapılabilir.</li>
                <li>Proje tabanlı öğrenme etkinlikleri ile yaratıcılık desteklenebilir.</li>
                <li>Başarılı öğrencilerin diğer öğrencilere mentorluk yapması sağlanabilir.</li>
            </ul>
        `;
    } else if (avgGrade >= 70) {
        recommendations = `
            <h5>İyi Performans</h5>
            <p>Sınıfın genel performansı iyi seviyededir. Daha da geliştirmek için:</p>
            <ul>
                <li>Öğrencilerin eksik olduğu konular belirlenerek ek çalışmalar yapılabilir.</li>
                <li>Farklı öğrenme stillerine hitap eden etkinlikler düzenlenebilir.</li>
                <li>Grup çalışmaları ile işbirlikçi öğrenme desteklenebilir.</li>
            </ul>
        `;
    } else if (avgGrade >= 55) {
        recommendations = `
            <h5>Orta Performans</h5>
            <p>Sınıfın genel performansı orta seviyededir. Geliştirmek için:</p>
            <ul>
                <li>Temel kavramların tekrar edilmesi için ek dersler düzenlenebilir.</li>
                <li>Bireysel öğrenme eksikliklerini belirlemek için tanılayıcı değerlendirmeler yapılabilir.</li>
                <li>Görsel ve işitsel materyaller kullanılarak öğrenme desteklenebilir.</li>
            </ul>
        `;
    } else if (avgGrade >= 45) {
        recommendations = `
            <h5>Ortanın Altı Performans</h5>
            <p>Sınıfın genel performansı ortanın altı seviyededir. İyileştirmek için:</p>
            <ul>
                <li>Temel kavramların yeniden öğretilmesi için ek dersler düzenlenmelidir.</li>
                <li>Öğrencilerin bireysel öğrenme eksikliklerini belirlemek için detaylı değerlendirmeler yapılmalıdır.</li>
                <li>Farklı öğretim yöntemleri ve materyalleri kullanılarak konuların anlaşılması desteklenmelidir.</li>
                <li>Veli işbirliği ile evde de çalışmaların desteklenmesi sağlanmalıdır.</li>
            </ul>
        `;
    } else {
        recommendations = `
            <h5>Zayıf Performans</h5>
            <p>Sınıfın genel performansı zayıf seviyededir. Acil iyileştirmeler için:</p>
            <ul>
                <li>Temel kavramların yeniden öğretilmesi için yoğun ek dersler düzenlenmelidir.</li>
                <li>Her öğrenci için bireysel öğrenme planları hazırlanmalıdır.</li>
                <li>Öğrencilerin motivasyonunu artırmak için küçük başarılar ödüllendirilmelidir.</li>
                <li>Veli ve rehberlik servisi işbirliği ile öğrencilere destek sağlanmalıdır.</li>
                <li>Öğretim yöntemleri ve materyalleri gözden geçirilmelidir.</li>
            </ul>
        `;
    }
    
    return recommendations;
}

// İstatistiksel analiz fonksiyonları
// Medyan hesaplama
function calculateMedian(values) {
    if (values.length === 0) return 0;
    
    // Değerleri sırala
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
        // Çift sayıda eleman varsa, ortadaki iki elemanın ortalamasını al
        return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
        // Tek sayıda eleman varsa, ortadaki elemanı al
        return sorted[middle];
    }
}

// Varyans hesaplama
function calculateVariance(values) {
    if (values.length === 0) return 0;
    
    // Ortalama hesapla
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Kareler toplamını hesapla
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const sumSquaredDiffs = squaredDiffs.reduce((sum, val) => sum + val, 0);
    
    // Varyans
    return sumSquaredDiffs / values.length;
}

// Standart sapma hesaplama
function calculateStandardDeviation(values) {
    return Math.sqrt(calculateVariance(values));
}

// Mod hesaplama (en sık tekrar eden değer)
function calculateMode(values) {
    if (values.length === 0) return "Veri yok";
    
    // Değerlerin frekansını hesapla
    const frequency = {};
    values.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
    });
    
    // En yüksek frekansa sahip değeri bul
    let maxFreq = 0;
    let modes = [];
    
    for (const val in frequency) {
        if (frequency[val] > maxFreq) {
            maxFreq = frequency[val];
            modes = [val];
        } else if (frequency[val] === maxFreq) {
            modes.push(val);
        }
    }
    
    // Eğer tüm değerler eşit frekansta ise mod yoktur
    if (modes.length === Object.keys(frequency).length) {
        return "Mod yok";
    }
    
    // Birden fazla mod varsa virgülle ayır
    return modes.join(", ");
}

// Çarpıklık hesaplama (skewness)
function calculateSkewness(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = calculateStandardDeviation(values);
    
    if (stdDev === 0) return 0;
    
    // Çarpıklık formülü
    const cubedDiffs = values.map(val => Math.pow((val - mean) / stdDev, 3));
    const sumCubedDiffs = cubedDiffs.reduce((sum, val) => sum + val, 0);
    
    return sumCubedDiffs / values.length;
}

// Başarı oranı hesaplama
function calculateSuccessRate(values, threshold) {
    if (values.length === 0) return 0;
    
    const successCount = values.filter(val => val >= threshold).length;
    return (successCount / values.length) * 100;
}

// Kriter analizi oluşturma
function generateCriteriaAnalysis(analysisData, criteriaNames) {
    let analysisHTML = '<div class="print-criteria-analysis-content">';
    
    // Her kriter için performans analizi
    criteriaNames.forEach((name, index) => {
        const avgGrade = analysisData.averageGrades[index];
        const performance = analysisData.criteriaPerformance[index];
        const performanceDesc = getPerformanceDescription(performance);
        
        analysisHTML += `
            <div class="criteria-analysis-item">
                <h5>${name}</h5>
                <p>Bu kriterde sınıf ortalaması <strong>${avgGrade}</strong> puan olup, 
                performans düzeyi <strong class="${getPerformanceColorClass(performance, true)}">${performanceDesc}</strong> olarak değerlendirilmiştir.</p>
            </div>
        `;
    });
    
    analysisHTML += '</div>';
    return analysisHTML;
}

// Genel sonuç oluşturma
function generateGeneralConclusion(analysisData) {
    const avgGrade = analysisData.totalAverageGrade;
    const performanceDesc = getPerformanceDescription(avgGrade);
    const successRate = calculateSuccessRate(currentStudents.map(s => s.total), 50);
    
    let conclusionHTML = '<div class="print-general-conclusion-content">';
    
    // Genel başarı durumu
    conclusionHTML += `
        <p>Sınav sonuçlarına göre, sınıfın genel başarı düzeyi <strong class="${getPerformanceColorClass(avgGrade, true)}">${performanceDesc}</strong> 
        olarak değerlendirilmiştir. Sınıf ortalaması <strong>${avgGrade.toFixed(2)}</strong> puan olup, 
        öğrencilerin <strong>${successRate.toFixed(2)}%</strong>'si 50 puan ve üzerinde not almıştır.</p>
    `;
    
    // Not dağılımı yorumu
    const distribution = analysisData.gradeDistribution;
    const totalStudents = analysisData.totalStudents;
    
    conclusionHTML += '<p>Not dağılımı incelendiğinde:</p><ul>';
    
    if (distribution.excellent > 0) {
        const percent = (distribution.excellent / totalStudents * 100).toFixed(2);
        conclusionHTML += `<li>Öğrencilerin <strong>${percent}%</strong>'si mükemmel (85-100) seviyesindedir.</li>`;
    }
    
    if (distribution.good > 0) {
        const percent = (distribution.good / totalStudents * 100).toFixed(2);
        conclusionHTML += `<li>Öğrencilerin <strong>${percent}%</strong>'si iyi (70-84) seviyesindedir.</li>`;
    }
    
    if (distribution.average > 0) {
        const percent = (distribution.average / totalStudents * 100).toFixed(2);
        conclusionHTML += `<li>Öğrencilerin <strong>${percent}%</strong>'si orta (55-69) seviyesindedir.</li>`;
    }
    
    if (distribution.belowAverage > 0) {
        const percent = (distribution.belowAverage / totalStudents * 100).toFixed(2);
        conclusionHTML += `<li>Öğrencilerin <strong>${percent}%</strong>'si ortanın altı (45-54) seviyesindedir.</li>`;
    }
    
    if (distribution.poor > 0) {
        const percent = (distribution.poor / totalStudents * 100).toFixed(2);
        conclusionHTML += `<li>Öğrencilerin <strong>${percent}%</strong>'si zayıf (0-44) seviyesindedir.</li>`;
    }
    
    conclusionHTML += '</ul>';
    
    // Soru bazlı performans yorumu
    conclusionHTML += '<p>Soru bazlı performans analizi:</p><ul>';
    
    // Anlaşılmış ve anlaşılmamış soruların sayısını hesapla
    const understoodQuestions = analysisData.topicAnalysis.filter(analysis => analysis === 'Anlaşılmış').length;
    const notUnderstoodQuestions = analysisData.topicAnalysis.filter(analysis => analysis === 'Anlaşılmamış').length;
    
    conclusionHTML += `<li>Toplam ${criteriaNames.length} sorudan <strong>${understoodQuestions}</strong> tanesi öğrenciler tarafından anlaşılmış, <strong>${notUnderstoodQuestions}</strong> tanesi anlaşılmamıştır.</li>`;
    
    // En yüksek ve en düşük cevaplanma oranına sahip soruları bul
    if (analysisData.answerPercentage.length > 0) {
        const maxAnswerPercentageIndex = analysisData.answerPercentage.indexOf(Math.max(...analysisData.answerPercentage));
        const minAnswerPercentageIndex = analysisData.answerPercentage.indexOf(Math.min(...analysisData.answerPercentage));
        
        conclusionHTML += `<li>En yüksek cevaplanma oranına sahip soru <strong>${criteriaNames[maxAnswerPercentageIndex]}</strong> (%${analysisData.answerPercentage[maxAnswerPercentageIndex]}), en düşük cevaplanma oranına sahip soru <strong>${criteriaNames[minAnswerPercentageIndex]}</strong> (%${analysisData.answerPercentage[minAnswerPercentageIndex]}).</li>`;
    }
    
    // Ortalama cevaplanma oranı
    const avgAnswerPercentage = analysisData.answerPercentage.reduce((sum, percentage) => sum + percentage, 0) / analysisData.answerPercentage.length;
    conclusionHTML += `<li>Soruların ortalama cevaplanma oranı <strong>%${avgAnswerPercentage.toFixed(2)}</strong>'dir.</li>`;
    
    conclusionHTML += '</ul>';
    
    // İstatistiksel yorum
    const median = calculateMedian(currentStudents.map(s => s.total));
    const stdDev = calculateStandardDeviation(currentStudents.map(s => s.total));
    const skewness = calculateSkewness(currentStudents.map(s => s.total));
    
    conclusionHTML += '<p>İstatistiksel olarak:</p>';
    
    if (Math.abs(median - avgGrade) < 5) {
        conclusionHTML += '<p>Medyan ve ortalama değerlerin birbirine yakın olması, not dağılımının dengeli olduğunu göstermektedir.</p>';
    } else if (median > avgGrade) {
        conclusionHTML += '<p>Medyanın ortalamadan yüksek olması, düşük notların dağılımı daha fazla etkilediğini göstermektedir.</p>';
    } else {
        conclusionHTML += '<p>Medyanın ortalamadan düşük olması, yüksek notların dağılımı daha fazla etkilediğini göstermektedir.</p>';
    }
    
    if (stdDev < 10) {
        conclusionHTML += '<p>Standart sapmanın düşük olması, öğrenci notlarının ortalama etrafında yoğunlaştığını ve sınıfın homojen olduğunu göstermektedir.</p>';
    } else if (stdDev > 20) {
        conclusionHTML += '<p>Standart sapmanın yüksek olması, öğrenci notlarının geniş bir aralığa yayıldığını ve sınıfın heterojen olduğunu göstermektedir.</p>';
    } else {
        conclusionHTML += '<p>Standart sapma değeri, öğrenci notlarının normal bir dağılım gösterdiğini işaret etmektedir.</p>';
    }
    
    if (skewness < -0.5) {
        conclusionHTML += '<p>Negatif çarpıklık değeri, notların dağılımının yüksek notlara doğru yoğunlaştığını göstermektedir.</p>';
    } else if (skewness > 0.5) {
        conclusionHTML += '<p>Pozitif çarpıklık değeri, notların dağılımının düşük notlara doğru yoğunlaştığını göstermektedir.</p>';
    } else {
        conclusionHTML += '<p>Çarpıklık değerinin sıfıra yakın olması, not dağılımının simetrik olduğunu göstermektedir.</p>';
    }
    
    conclusionHTML += '</div>';
    return conclusionHTML;
}

// Öneriler oluşturma
function generateSuggestions(analysisData, criteriaNames) {
    let suggestionsHTML = '<div class="print-suggestions-content">';
    
    // Genel başarı durumuna göre öneriler
    const avgGrade = analysisData.totalAverageGrade;
    
    if (avgGrade < 50) {
        suggestionsHTML += `
            <p>Sınıfın genel başarı düzeyi düşük olduğundan, aşağıdaki önlemler alınabilir:</p>
            <ul>
                <li>Temel kavramların tekrar edilmesi için ek dersler düzenlenebilir.</li>
                <li>Öğrencilerin bireysel öğrenme eksikliklerini belirlemek için tanılayıcı değerlendirmeler yapılabilir.</li>
                <li>Farklı öğretim yöntemleri ve materyalleri kullanılarak konuların anlaşılması desteklenebilir.</li>
                <li>Öğrencilerin motivasyonunu artırmak için küçük başarılar ödüllendirilebilir.</li>
            </ul>
        `;
    } else if (avgGrade < 70) {
        suggestionsHTML += `
            <p>Sınıfın genel başarı düzeyi orta seviyede olduğundan, aşağıdaki önlemler alınabilir:</p>
            <ul>
                <li>Anlaşılmayan konuların belirlenmesi için öğrencilerle görüşmeler yapılabilir.</li>
                <li>Öğrencilerin aktif katılımını sağlayacak grup çalışmaları düzenlenebilir.</li>
                <li>Farklı zorluk seviyelerinde alıştırmalar ve ödevler verilebilir.</li>
                <li>Öğrencilerin kendi öğrenme süreçlerini değerlendirmeleri için öz-değerlendirme etkinlikleri yapılabilir.</li>
            </ul>
        `;
    } else {
        suggestionsHTML += `
            <p>Sınıfın genel başarı düzeyi iyi olduğundan, aşağıdaki önlemler alınabilir:</p>
            <ul>
                <li>Daha ileri düzey konular ve projeler ile öğrencilerin potansiyelleri geliştirilebilir.</li>
                <li>Başarılı öğrencilerin diğer öğrencilere mentorluk yapması sağlanabilir.</li>
                <li>Yarışma ve etkinliklerle öğrencilerin motivasyonu yüksek tutulabilir.</li>
                <li>Farklı öğrenme stillerine hitap eden zenginleştirilmiş içerikler sunulabilir.</li>
            </ul>
        `;
    }
    
    // Soru bazlı öneriler
    suggestionsHTML += '<p>Soru bazlı değerlendirme sonuçlarına göre:</p><ul>';
    
    // Anlaşılmamış sorular için öneriler
    const notUnderstoodQuestions = analysisData.topicAnalysis
        .map((analysis, index) => ({ analysis, name: criteriaNames[index], index, percentage: analysisData.answerPercentage[index] }))
        .filter(q => q.analysis === 'Anlaşılmamış')
        .sort((a, b) => a.percentage - b.percentage);
    
    if (notUnderstoodQuestions.length > 0) {
        suggestionsHTML += `<li><strong>Anlaşılmamış sorular</strong> için ek çalışmalar yapılmalıdır. Özellikle şu sorular üzerinde durulmalıdır:</li>`;
        
        notUnderstoodQuestions.slice(0, 3).forEach(q => {
            suggestionsHTML += `<li><strong>${q.name}</strong> - Cevaplanma oranı sadece %${q.percentage}. Bu konunun tekrar anlatılması ve ek alıştırmalar yapılması önerilir.</li>`;
        });
    }
    
    // Düşük performanslı kriterleri bul
    const lowestPerformanceCriteria = [...analysisData.criteriaPerformance]
        .map((perf, index) => ({ 
            performance: perf, 
            name: criteriaNames[index], 
            index,
            avgGrade: analysisData.averageGrades[index],
            answerPercentage: analysisData.answerPercentage[index]
        }))
        .sort((a, b) => a.performance - b.performance)
        .slice(0, 3);
    
    lowestPerformanceCriteria.forEach(criteria => {
        if (criteria.performance < 60) {
            suggestionsHTML += `<li><strong>${criteria.name}</strong> sorusunda ortalama puan ${criteria.avgGrade} ve performans %${criteria.performance} ile düşüktür. Bu sorunun kapsadığı konular için ek çalışmalar ve alıştırmalar yapılması önerilir.</li>`;
        }
    });
    
    // En yüksek performanslı kriterleri bul
    const highestPerformanceCriteria = [...analysisData.criteriaPerformance]
        .map((perf, index) => ({ 
            performance: perf, 
            name: criteriaNames[index], 
            index,
            avgGrade: analysisData.averageGrades[index],
            answerPercentage: analysisData.answerPercentage[index]
        }))
        .sort((a, b) => b.performance - a.performance)
        .slice(0, 3);
    
    highestPerformanceCriteria.forEach(criteria => {
        if (criteria.performance > 70) {
            suggestionsHTML += `<li><strong>${criteria.name}</strong> sorusunda ortalama puan ${criteria.avgGrade} ve performans %${criteria.performance} ile yüksektir. Bu alandaki başarılı öğretim yöntemleri diğer alanlara da uygulanabilir.</li>`;
        }
    });
    
    suggestionsHTML += '</ul>';
    
    // Genel öneriler
    suggestionsHTML += `
        <p>Genel öneriler:</p>
        <ul>
            <li>Öğrencilerin bireysel gelişimlerini takip etmek için düzenli değerlendirmeler yapılmalıdır.</li>
            <li>Farklı öğrenme stillerine hitap eden çeşitli öğretim yöntemleri kullanılmalıdır.</li>
            <li>Öğrencilerin aktif katılımını sağlayacak etkinlikler düzenlenmelidir.</li>
            <li>Velilerle düzenli iletişim kurularak öğrencilerin gelişimi hakkında bilgi verilmelidir.</li>
            <li>Anlaşılmamış konular için ek materyaller ve görsel destekler sağlanmalıdır.</li>
            <li>Öğrencilerin soru çözme stratejilerini geliştirmek için rehberlik yapılmalıdır.</li>
        </ul>
    `;
    
    suggestionsHTML += '</div>';
    return suggestionsHTML;
}
