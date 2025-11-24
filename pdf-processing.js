// PDF'den sınıf ve öğrenci bilgilerini çıkarma
async function extractClassInfo(pdf) {
    const classes = {};
    const numPages = pdf.numPages;
    let y1ColumnRange = null;

    try {
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            debugLog(`Sayfa ${pageNum}/${numPages} işleniyor...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            debugLog(`Sayfa ${pageNum} - metin öğe sayısı: ${textContent.items.length}`);

            // 1. Tüm metin içeriğini birleştirme
            let fullText = '';
            let prevItem = null;
            let lineTexts = [];
            let currentLine = [];

            // İlk adımda satırları oluştur
            // Toleransı daha da artırdık (6 -> 10) çünkü "50" gibi notlar satır hizasından kaymış olabilir
            const ROW_TOLERANCE = 10;

            for (const item of textContent.items) {
                if (prevItem && Math.abs(prevItem.transform[5] - item.transform[5]) < ROW_TOLERANCE) {
                    // Aynı satırda, önceki öğeye ekle
                    currentLine.push(item);
                } else {
                    // Yeni satır başlat
                    if (currentLine.length > 0) {
                        lineTexts.push(currentLine);
                    }
                    currentLine = [item];
                }
                prevItem = item;
            }

            // Son satırı ekle
            if (currentLine.length > 0) {
                lineTexts.push(currentLine);
            }

            // Her satırı işle ve metne dönüştür
            let lines = [];

            // Y1 sütununu ara (her sayfada)
            // Y1 sütununu ara (her sayfada)
            for (let i = 0; i < lineTexts.length; i++) {
                const line = lineTexts[i];
                for (const item of line) {
                    const text = item.str.trim().toUpperCase();
                    // Genişletilmiş başlık listesi
                    if (['Y1', 'Y 1', '1.YAZILI', '1. YAZILI', 'YAZILI 1', '1.SINAV', '1. SINAV', 'SINAV 1', '1.Y', '1. Y'].includes(text)) {
                        y1ColumnRange = {
                            min: item.transform[4] - 20,
                            max: item.transform[4] + item.width + 20
                        };
                        debugLog(`Y1 sütunu bulundu (${text}): ${y1ColumnRange.min} - ${y1ColumnRange.max}`);
                        break;
                    }

                    // "YAZILI" başlığı altında "1" arama mantığı
                    if (text === 'YAZILI') {
                        // Bu satırın altında (y koordinatı daha küçük) ve x koordinatı yakın olan "1" var mı bak
                        // Bir sonraki satıra bak
                        if (i + 1 < lineTexts.length) {
                            const nextLine = lineTexts[i + 1];
                            const oneItem = nextLine.find(subItem => {
                                const subText = subItem.str.trim();
                                return (subText === '1' || subText === '(1)') &&
                                    Math.abs(subItem.transform[4] - item.transform[4]) < 50; // X koordinatı yakın
                            });

                            if (oneItem) {
                                y1ColumnRange = {
                                    min: oneItem.transform[4] - 20,
                                    max: oneItem.transform[4] + oneItem.width + 20
                                };
                                debugLog(`Y1 sütunu bulundu (YAZILI -> 1): ${y1ColumnRange.min} - ${y1ColumnRange.max}`);
                                break;
                            }
                        }
                    }
                }
                if (y1ColumnRange) break;
            }

            for (const line of lineTexts) {
                // Satırdaki öğeleri x pozisyonuna göre sırala
                line.sort((a, b) => a.transform[4] - b.transform[4]);

                let lineText = '';
                let prevLineItem = null;

                for (const item of line) {
                    if (prevLineItem) {
                        // Öğeler arasındaki mesafeyi kontrol et
                        const gap = item.transform[4] - (prevLineItem.transform[4] + prevLineItem.width);

                        // Yakın karakterleri birleştir (küçük aralıkları yok say)
                        if (gap < 2) {
                            lineText += item.str;
                        } else if (gap < 20) {
                            // Normal kelime aralığı
                            lineText += ' ' + item.str;
                        } else {
                            // Büyük boşluk, muhtemelen sütun aralığı
                            lineText += '\t' + item.str;
                        }
                    } else {
                        lineText += item.str;
                    }
                    prevLineItem = item;
                }

                lines.push(lineText);
                fullText += lineText + '\n';
            }

            // Geliştirme modunda metin içeriğini gösterme
            if (debugMode) {
                debugLog(`Sayfa ${pageNum} metin içeriği (ilk 500 karakter):`, fullText.substring(0, 500) + '...');
            }

            // 2. Sınıf adını bulma
            const classNamePattern = /(\d+\.\s*Sınıf\s*\/\s*[A-Z]\s*Şubesi.*?)(?:\n|$)/i;
            const classMatch = fullText.match(classNamePattern);

            // Ders adını bulma (Geliştirilmiş)
            let currentCourse = "";

            // 1. Yöntem: Satır satır ara (Daha güvenilir)
            for (const line of lines) {
                // "Ders:" veya "Dersin Adı:" içeren satırı bul
                const courseMatch = line.match(/(?:Ders|Dersin Adı|Ders Adı)\s*[:\.]\s*(.*)/i);
                if (courseMatch) {
                    let potentialCourse = courseMatch[1].trim();
                    potentialCourse = potentialCourse.replace(/[\(\)]/g, '').trim();
                    if (potentialCourse.length > 2) {
                        currentCourse = potentialCourse;
                        debugLog(`Ders adı satırdan bulundu: ${currentCourse}`);
                        break;
                    }
                }
            }

            // 2. Yöntem: Full text regex (Fallback)
            if (!currentCourse) {
                const courseNamePattern = /(?:Ders|Dersin Adı)\s*:\s*(.*?)(?:\n|$|\s{2,})/i;
                const courseMatchFull = fullText.match(courseNamePattern);
                if (courseMatchFull) {
                    currentCourse = courseMatchFull[1].trim();
                    currentCourse = currentCourse.replace(/[\(\)]/g, '').trim();
                    debugLog(`Ders adı regex ile bulundu: ${currentCourse}`);
                }
            }

            // 3. Yöntem: Yaygın Ders İsimleri Taraması (Fallback 2)
            if (!currentCourse) {
                const COMMON_COURSE_NAMES = [
                    "MATEMATİK", "FİZİK", "KİMYA", "BİYOLOJİ",
                    "TÜRK DİLİ VE EDEBİYATI", "EDEBİYAT", "TARİH", "COĞRAFYA",
                    "İNGİLİZCE", "ALMANCA", "FRANSIZCA",
                    "FELSEFE", "DİN KÜLTÜRÜ", "BEDEN EĞİTİMİ",
                    "MÜZİK", "GÖRSEL SANATLAR", "BİLİŞİM", "SAĞLIK BİLGİSİ",
                    "TRAFİK", "DEMOKRASİ", "İNKILAP TARİHİ", "SEÇMELİ", "YABANCI DİL"
                ];

                for (const line of lines) {
                    const upperLine = line.toUpperCase();
                    // Satırda yaygın ders isimlerinden biri geçiyor mu?
                    const foundCourse = COMMON_COURSE_NAMES.find(course => upperLine.includes(course));

                    if (foundCourse) {
                        // Bulunan ders isminin satırda tek başına veya belirgin olup olmadığını kontrol et
                        // Başlık satırı genelde kısadır veya sadece ders adını içerir
                        // Ayrıca "Sınıf" kelimesi içermemeli (örn. "Matematik Sınıfı" değilse)
                        if (line.length < 60 && !upperLine.includes("SINIF") && !upperLine.includes("ŞUBE")) {
                            // Satırın tamamını ders adı olarak almayı dene, eğer çok uzun değilse
                            // Çünkü "SEÇMELİ MATEMATİK" gibi olabilir
                            if (line.length < 40) {
                                currentCourse = line.trim();
                            } else {
                                currentCourse = foundCourse;
                            }
                            debugLog(`Ders adı yaygın listeden bulundu: ${currentCourse}`);
                            break;
                        }
                    }
                }
            }

            let currentClass = null;

            if (classMatch) {
                // Sınıf adını temizle (Sadece "9. Sınıf / E Şubesi" kısmını al)
                let className = classMatch[1].trim();

                // Regex zaten sadece şubeye kadar alıyor ama emin olalım
                // Okul ismi parantez içinde veya tire ile ayrılmış olabilir, bunları atalım
                className = className.split('(')[0].trim();

                // Sayfada "1" numaralı sıra var mı kontrol et (Yeni liste başlangıcı mı?)
                let isNewList = false;
                for (const line of lines) {
                    // Satır başında "1" ve ardından bir sayı (öğrenci no) geliyorsa
                    if (/^\s*1\s+\d+/.test(line)) {
                        isNewList = true;
                        break;
                    }
                }

                // Sınıf anahtarını oluştur
                // Eğer ders adı bulunduysa, anahtara ekle: "9. Sınıf / E Şubesi (MATEMATİK)"
                let classKey = className;
                if (currentCourse) {
                    classKey = `${className} (${currentCourse})`;
                }

                // Çakışma Kontrolü ve Çoklu Ders Yönetimi
                if (classes[classKey] && classes[classKey].length > 0) {
                    if (isNewList) {
                        // Aynı isimde sınıf var VE yeni bir liste başlıyor.
                        // Bu, aynı dersin farklı bir listesi olabilir (örn. 2. grup) veya
                        // ders adı tespit edilemediği için aynı isimde kalmış farklı bir ders olabilir.

                        // Eğer ders adı tespit edilemediyse (classKey == className),
                        // bu kesinlikle farklı bir derstir (veya aynı dersin tekrarı).
                        // Ayırmak için sayaç ekleyelim.

                        if (!currentCourse) {
                            // "Ders" içeren anahtarları bul
                            const existingKeys = Object.keys(classes).filter(k => k.startsWith(className + " (Ders"));
                            let counter = existingKeys.length + 1;

                            // Eğer ilk defa çakışıyorsa, mevcut olanı da yeniden adlandırmak gerekebilir
                            // Ama mevcut olanı değiştirmek karmaşık, yenisine numara verelim.
                            // Eğer hiç "Ders" yoksa, bu 2. derstir.
                            if (existingKeys.length === 0) {
                                // Mevcut olan "Ders 1" olsun mu? Hayır, olduğu gibi kalsın, yenisi "Ders 2" olsun.
                                // Veya tutarlılık için:
                                // İlkini bulup değiştirmek daha temiz ama veri kaybı riski var.
                                // Basitçe yenisine ekleyelim.
                                counter = 2; // Çünkü ilki (suffixsiz) 1 sayılır
                            } else {
                                counter = existingKeys.length + 2; // Suffixsiz + Suffixliler
                            }

                            classKey = `${className} (Ders ${counter})`;
                            debugLog(`Yeni liste (ders adı yok) tespit edildi. Yeni anahtar: ${classKey}`);
                        } else {
                            // Ders adı var ama yine de çakışıyor (Aynı dersin 2. listesi mi?)
                            // Genelde aynı dersin devamı olur, ama "isNewList" true ise
                            // belki de aynı dersin başka bir sınavıdır?
                            // Kullanıcı "farklı derslere ait buton ekle" dedi.
                            // Eğer ders adı aynıysa, muhtemelen devam sayfasıdır veya aynı dersin başka notudur.
                            // Ancak "isNewList" true ise bu yeni bir kağıttır.
                            // Güvenlik için buna da sayaç ekleyelim veya "(2)" diyelim.

                            // Mevcut anahtarla başlayanları bul
                            const sameCourseKeys = Object.keys(classes).filter(k => k.startsWith(classKey));
                            if (sameCourseKeys.length > 0) {
                                let counter = sameCourseKeys.length + 1;
                                classKey = `${classKey} (${counter})`;
                                debugLog(`Aynı dersin yeni listesi tespit edildi. Yeni anahtar: ${classKey}`);
                            }
                        }
                    } else {
                        // Yeni liste değil, devam sayfası.
                        // Mevcut classKey ile devam et.
                        // Ancak eğer daha önce bu sınıf için "Ders X" türetildiyse, en sonuncusuna eklemeliyiz.

                        if (!currentCourse) {
                            // Ders adı yoksa, en son eklenen "Ders X" veya saf sınıf adına ekle
                            // "Ders" içerenleri bul
                            const existingKeys = Object.keys(classes).filter(k => k.startsWith(className));
                            // Sort edip sonuncuyu alalım (alfabetik sort işe yarar mı? "Ders 10" vs "Ders 2" sorunu olabilir ama şimdilik basit)
                            // En doğrusu en son işlenen sayfadaki sınıfı hatırlamak ama stateless yapıyoruz.
                            // Basitçe: Eğer saf hali varsa ve başka yoksa safa ekle.
                            // Eğer türetilmişler varsa, en sonuncuya ekle.

                            if (existingKeys.length > 1) {
                                // En sonuncuyu bulmaya çalışalım
                                // Aslında extractClassInfo sıralı çalışıyor, yani classes objesine en son eklenen key
                                // muhtemelen şu anki devam eden sınıftır.
                                // Ama object key sırasına güvenilmez.
                                // Şimdilik isNewList false ise ve classKey (saf veya dersli) zaten varsa, ona ekle.
                                // Zaten yukarıda classKey oluşturduk.
                                // Eğer classKey saf ise ve içeride "Ders 2" varsa, bu sayfa "Ders 2"nin devamı olabilir mi?
                                // Evet. Eğer saf classKey doluysa ve biz şu an saf classKey hedefliyorsak,
                                // ama aslında son eklenen "Ders 2" ise...

                                // Bu karmaşayı çözmek için: Eğer ders adı yoksa,
                                // ve sistemde bu sınıfın türevleri varsa, en son türeve ekle.
                                const derivedKeys = Object.keys(classes).filter(k => k.startsWith(className + " (Ders"));
                                if (derivedKeys.length > 0) {
                                    // "Ders X" formatındaki sayıları çekip max'ı bul
                                    let maxNum = 0;
                                    let lastKey = "";
                                    derivedKeys.forEach(k => {
                                        const match = k.match(/Ders (\d+)/);
                                        if (match) {
                                            const num = parseInt(match[1]);
                                            if (num > maxNum) {
                                                maxNum = num;
                                                lastKey = k;
                                            }
                                        }
                                    });

                                    if (lastKey) {
                                        classKey = lastKey;
                                        debugLog(`Devam sayfası, son türetilen sınıfa eklendi: ${classKey}`);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Bu anahtar henüz yok.
                    // Ancak ders adı yoksa, ve daha önce "Ders X" türetildiyse,
                    // bu yeni sayfa yeni bir ders mi yoksa devam mı?
                    // isNewList kontrolü burada önemli.

                    if (!currentCourse && !isNewList) {
                        // Ders adı yok, yeni liste değil (devam sayfası).
                        // Ama classKey (saf) yok. Demek ki önceki sayfalar "Ders X"e dönüştü.
                        // O zaman bu da son "Ders X"e ait olmalı.
                        const derivedKeys = Object.keys(classes).filter(k => k.startsWith(className + " (Ders"));
                        if (derivedKeys.length > 0) {
                            let maxNum = 0;
                            let lastKey = "";
                            derivedKeys.forEach(k => {
                                const match = k.match(/Ders (\d+)/);
                                if (match) {
                                    const num = parseInt(match[1]);
                                    if (num > maxNum) {
                                        maxNum = num;
                                        lastKey = k;
                                    }
                                }
                            });
                            if (lastKey) classKey = lastKey;
                        }
                    }
                }

                currentClass = classKey;
                debugLog(`Sınıf işleniyor: ${currentClass}`);
                if (!classes[currentClass]) {
                    classes[currentClass] = [];
                }
            } else {
                debugLog(`Sayfa ${pageNum}'de sınıf bilgisi bulunamadı`);
            }

            // 3. Öğrenci bilgilerini bulma ve sınıflandırma
            if (currentClass) {
                // A) Satır bazlı arama (öncelikli)
                let studentsFound = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes('\t')) {
                        const columns = line.split('\t').map(col => col.trim());

                        if (columns.length >= 3) {
                            const numberMatch = columns[0].match(/^\s*(\d+)\s*$/);
                            if (numberMatch) {
                                const studentNo = numberMatch[1];
                                let genderIndex = -1;
                                for (let i = 1; i < columns.length; i++) {
                                    if (/^(Erkek|Kız|erkek|kız)$/i.test(columns[i])) {
                                        genderIndex = i;
                                        break;
                                    }
                                }

                                if (genderIndex > 0) {
                                    let firstName = columns[1].replace(/\s+/g, ' ').trim();
                                    let lastName = columns[genderIndex + 1] ? columns[genderIndex + 1].replace(/\s+/g, ' ').trim() : '';

                                    if (!lastName && firstName.includes(' ')) {
                                        const nameParts = firstName.split(' ');
                                        lastName = nameParts.pop();
                                        firstName = nameParts.join(' ');
                                    }

                                    if (firstName && lastName) {
                                        firstName = mergeLetters(firstName);
                                        lastName = mergeLetters(lastName);

                                        let y1Score = 0;
                                        let foundInColumn = false;

                                        // 1. Yöntem: Y1 sütun aralığından bul
                                        if (y1ColumnRange && lineTexts[i]) {
                                            const scoreItem = lineTexts[i].find(item => {
                                                const itemX = item.transform[4];
                                                return itemX >= y1ColumnRange.min && itemX <= y1ColumnRange.max;
                                            });

                                            if (scoreItem) {
                                                const score = parseScore(scoreItem.str.trim());
                                                if (!isNaN(score)) {
                                                    y1Score = score;
                                                    foundInColumn = true;
                                                }
                                            }
                                        }

                                        // Fallback: Sütun bulunamadıysa veya not okunamadıysa
                                        if (y1Score === 0) {
                                            // Eğer soyadı sayısal ise, bu muhtemelen nottur
                                            if (/^\d+(?:[.,]\d+)?$/.test(lastName)) {
                                                y1Score = parseScore(lastName);
                                                lastName = ""; // Soyadını temizle

                                                // Adı soyadı ayrıştırmasını tekrar dene (firstName içinde kalmış olabilir)
                                                if (firstName.includes(' ')) {
                                                    const nameParts = firstName.split(' ');
                                                    lastName = nameParts.pop();
                                                    firstName = nameParts.join(' ');
                                                }
                                            }
                                            // Değilse, cinsiyetten sonraki diğer sütunlara bak
                                            else {
                                                for (let k = genderIndex + 1; k < columns.length; k++) {
                                                    const col = columns[k].trim();
                                                    // Sayısal değer ara (ilk bulunan Y1 kabul edilir)
                                                    if (/^\d+(?:[.,]\d+)?$/.test(col)) {
                                                        y1Score = parseScore(col);
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        classes[currentClass].push({
                                            student_no: studentNo,
                                            first_name: firstName,
                                            last_name: lastName,
                                            y1_score: y1Score
                                        });

                                        studentsFound = true;
                                    }
                                }
                            }
                        }
                    }
                }

                // C) Regex ve Sezgisel Analiz (Gelişmiş)
                if (classes[currentClass].length === 0 || !studentsFound) {
                    debugLog(`Standart desenlerle öğrenci bulunamadı, Regex ve Sezgisel analiz deneniyor...`);

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        // Örnek satır: "1 1234 AHMET YILMAZ E 90 85 ..."
                        // Regex: Sıra No (Opsiyonel) + Öğrenci No + Ad Soyad + Cinsiyet (Opsiyonel) + Notlar
                        // Not: Ad soyad ve notlar arasına esneklik katıyoruz

                        // 1. Adım: Satırdaki tüm sayıları ve kelimeleri ayır
                        const tokens = line.trim().split(/\s+/);

                        // En az 3 token olmalı (No, Ad, Soyad)
                        if (tokens.length < 3) continue;

                        // Öğrenci numarası tespiti (Genellikle satırın başındaki ilk veya ikinci sayı)
                        let studentNo = null;
                        let nameStartIndex = 0;

                        // İlk token sayı mı?
                        if (/^\d+$/.test(tokens[0])) {
                            // İkinci token de sayı mı? (Sıra no + Öğrenci no durumu)
                            if (tokens.length > 1 && /^\d+$/.test(tokens[1])) {
                                studentNo = tokens[1];
                                nameStartIndex = 2;
                            } else {
                                studentNo = tokens[0];
                                nameStartIndex = 1;
                            }
                        }

                        if (studentNo) {
                            // İsim ve notları ayır
                            let firstName = "";
                            let lastName = "";
                            let genderIndex = -1;
                            let potentialScores = [];

                            // Tokenleri tara
                            for (let j = nameStartIndex; j < tokens.length; j++) {
                                const token = tokens[j];

                                // Cinsiyet tespiti
                                if (/^(Erkek|Kız|E|K)$/i.test(token)) {
                                    genderIndex = j;
                                    continue; // Cinsiyeti isme dahil etme
                                }

                                // Not tespiti (0-100 arası sayı)
                                // Virgüllü sayılar da olabilir (örn: 85,5)
                                if (/^\d+(?:[.,]\d+)?$/.test(token)) {
                                    // Sayısal değer, muhtemelen not
                                    // Ancak ismin parçası olan bir sayı olmamalı (nadiren olur ama kontrol edelim)
                                    // Genellikle isimden sonra gelir
                                    potentialScores.push({
                                        value: parseScore(token),
                                        index: j,
                                        raw: token
                                    });
                                } else {
                                    // Kelime, ismin parçası
                                    // Eğer henüz notlara gelmediysek isme ekle
                                    if (potentialScores.length === 0) {
                                        if (lastName) {
                                            firstName += (firstName ? " " : "") + lastName;
                                        }
                                        lastName = token;
                                    }
                                }
                            }

                            // İsim oluşturma kontrolü
                            if (firstName && lastName) {
                                firstName = mergeLetters(firstName);
                                lastName = mergeLetters(lastName);

                                let y1Score = 0;

                                // Y1 Notunu Bulma Stratejisi

                                // Strateji 1: Sütun Başlığı Varsa (y1ColumnRange)
                                if (y1ColumnRange && lineTexts[i]) {
                                    const scoreItem = lineTexts[i].find(item => {
                                        const itemX = item.transform[4];
                                        return itemX >= y1ColumnRange.min && itemX <= y1ColumnRange.max;
                                    });
                                    if (scoreItem) {
                                        const score = parseScore(scoreItem.str.trim());
                                        if (!isNaN(score)) y1Score = score;
                                    }
                                }

                                // Strateji 2: Sezgisel (Heuristic) - İlk geçerli notu al
                                if (y1Score === 0 && potentialScores.length > 0) {
                                    // Genellikle ilk sayısal değer Y1 notudur (eğer sıra no ve öğrenci no hariçse)
                                    // Cinsiyetten hemen sonra gelen sayı en güçlü adaydır
                                    if (genderIndex !== -1) {
                                        const scoreAfterGender = potentialScores.find(s => s.index > genderIndex);
                                        if (scoreAfterGender) {
                                            y1Score = scoreAfterGender.value;
                                        }
                                    }

                                    // Cinsiyet bulunamadıysa veya sonrasında not yoksa, isimden sonraki ilk sayıyı al
                                    if (y1Score === 0) {
                                        y1Score = potentialScores[0].value;
                                    }
                                }

                                classes[currentClass].push({
                                    student_no: studentNo,
                                    first_name: firstName,
                                    last_name: lastName,
                                    y1_score: y1Score
                                });
                                studentsFound = true;
                            }
                        }
                    }
                }

                debugLog(`${currentClass} sınıfında ${classes[currentClass].length} öğrenci bulundu`);
            }
        }

        return classes;
    } catch (err) {
        debugLog(`PDF işleme hatası: ${err.message}`);
        throw err;
    }
}

// Sınıfları ve öğrencileri görüntüleme
function displayClassesAndStudents(classes) {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '';

    Object.keys(classes).forEach(className => {
        classes[className].forEach(student => {
            if (student.first_name && student.first_name.match(/^\d+\s+/)) {
                const parts = student.first_name.trim().split(/\s+/);
                if (parts.length > 1 && /^\d+$/.test(parts[0])) {
                    student.student_no = parts[0];
                    student.first_name = parts.slice(1).join(' ');
                }
            }
        });
    });

    const importButtonsContainer = document.createElement('div');
    importButtonsContainer.className = 'mt-3 mb-3 d-flex flex-wrap gap-2';
    importButtonsContainer.innerHTML = '<h5 class="w-100">PDF\'den Öğrencileri Performans Tablosuna Aktar:</h5>';

    Object.entries(classes).forEach(([className, students]) => {
        if (students.length === 0) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-success';
        btn.textContent = `${className} Sınıfını Aktar (${students.length} öğrenci)`;
        btn.addEventListener('click', function () {
            importStudentsToPerformanceTable(className);
        });
        importButtonsContainer.appendChild(btn);
    });

    resultsContainer.appendChild(importButtonsContainer);
}

function copyStudentInfo(e) {
    const button = e.currentTarget;
    const field = button.getAttribute('data-field');
    const index = button.getAttribute('data-index');
    const className = button.getAttribute('data-class');
    const student = classesByName[className][index];
    let textToCopy = field === 'all' ? `${student.student_no} ${student.first_name} ${student.last_name}` : student[field];
    navigator.clipboard.writeText(textToCopy).then(() => showCopySuccess(button, 'Kopyalandı'));
}

function copyNumbersInfo(e) {
    const button = e.currentTarget;
    const className = button.getAttribute('data-class');
    const students = classesByName[className];
    let allNumbers = '';
    students.forEach(student => { allNumbers += student.student_no + '\n'; });
    navigator.clipboard.writeText(allNumbers.trim()).then(() => showCopySuccess(button, 'Tüm Numaralar'));
}

function copyNamesInfo(e) {
    const button = e.currentTarget;
    const className = button.getAttribute('data-class');
    const students = classesByName[className];
    let allNames = '';
    students.forEach(student => { allNames += student.first_name + '\n'; });
    navigator.clipboard.writeText(allNames.trim()).then(() => showCopySuccess(button, 'Tüm Adlar'));
}

function showCopySuccess(button, type) {
    const originalText = button.textContent;
    button.innerHTML = `<i class="bi bi-check"></i> ${type} Kopyalandı`;
    button.classList.remove('btn-outline-secondary');
    button.classList.add('btn-success');
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-secondary');
    }, 1500);
}

function mergeLetters(text) {
    if (!text) return '';
    return text;
}

function parseScore(scoreStr) {
    if (!scoreStr) return 0;
    const normalized = scoreStr.replace(',', '.').trim();
    const score = parseFloat(normalized);
    if (isNaN(score)) return 0;
    return Math.round(score);
}
