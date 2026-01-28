/*
 * Smart PDF Export Plugin for Obsidian
 * 빌드 없이 바로 사용 가능한 JavaScript 버전 (v1.0.3 - 모바일 저장 수정)
 * 
 * 변경사항 v1.0.3:
 * - 모바일에서 html2pdf.save() 대신 Vault API로 직접 저장
 * - PDF가 Vault 폴더 내부에 저장되어 Obsidian에서 바로 확인 가능
 * 
 * 변경사항 v1.0.2:
 * - PDF 내보내기 명령어 ID 수정: app:export-pdf → workspace:export-pdf
 * 
 * 변경사항 v1.0.1:
 * - MarkdownView 참조 문제 수정
 * - 에러 핸들링 강화
 */

'use strict';

const obsidian = require('obsidian');

/**
 * "Smart Break" CSS
 * 인쇄/PDF 변환 시 Callout 블록이 페이지 경계에서 잘리는 것을 방지합니다.
 */
const PDF_SMART_BREAK_CSS = `
@media print {
    .callout {
        break-inside: avoid !important;
        display: block !important;
        page-break-inside: avoid !important;
    }
    
    .callout-title {
        break-after: avoid !important;
        page-break-after: avoid !important;
    }
    
    .callout-content {
        break-before: avoid !important;
        display: block !important;
        page-break-before: avoid !important;
    }
    
    .callout h1, .callout h2, .callout h3, 
    .callout h4, .callout h5, .callout h6 {
        break-after: avoid !important;
        page-break-after: avoid !important;
    }
    
    .callout img {
        break-inside: avoid !important;
        max-height: 90vh;
        page-break-inside: avoid !important;
    }
}
`;

/**
 * html2pdf.js를 CDN에서 동적으로 로드하는 함수
 */
async function loadHtml2Pdf() {
    if (typeof html2pdf !== 'undefined') {
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
            console.log('[SmartPDF] html2pdf.js 로드 완료');
            resolve();
        };
        script.onerror = () => reject(new Error('html2pdf.js 라이브러리를 로드할 수 없습니다. 인터넷 연결을 확인하세요.'));
        document.head.appendChild(script);
    });
}

/**
 * SmartPdfPlugin 메인 클래스
 */
class SmartPdfPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.styleId = 'smart-pdf-break-style';
    }

    async onload() {
        console.log('[SmartPDF] 플러그인 로드 시작');

        this.applyPdfStyles();

        this.addRibbonIcon('file-down', 'PDF로 내보내기 (Smart Layout)', async (evt) => {
            console.log('[SmartPDF] 리본 아이콘 클릭됨');
            await this.exportToPdf();
        });

        this.addCommand({
            id: 'export-smart-pdf',
            name: 'PDF로 내보내기 (Smart Layout)',
            callback: async () => {
                console.log('[SmartPDF] 명령어 실행됨');
                await this.exportToPdf();
            }
        });

        // 모바일에서는 라이브러리 미리 로드 (사용자 대기 시간 단축)
        if (obsidian.Platform.isMobile) {
            loadHtml2Pdf().catch(err => {
                console.warn('[SmartPDF] html2pdf.js 사전 로드 실패:', err);
            });
        }

        console.log('[SmartPDF] 플러그인 로드 완료');
    }

    onunload() {
        console.log('[SmartPDF] 플러그인 언로드됨');
        this.removePdfStyles();
    }

    applyPdfStyles() {
        this.removePdfStyles();
        const styleEl = document.createElement('style');
        styleEl.id = this.styleId;
        styleEl.textContent = PDF_SMART_BREAK_CSS;
        document.head.appendChild(styleEl);
        console.log('[SmartPDF] CSS 주입 완료');
    }

    removePdfStyles() {
        const existingStyle = document.getElementById(this.styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    getActiveMarkdownView() {
        const activeLeaf = this.app.workspace.activeLeaf;
        
        if (!activeLeaf) {
            console.log('[SmartPDF] activeLeaf가 없음');
            return null;
        }

        const view = activeLeaf.view;
        
        if (!view) {
            console.log('[SmartPDF] view가 없음');
            return null;
        }

        const viewType = view.getViewType();
        console.log('[SmartPDF] 현재 뷰 타입:', viewType);

        if (viewType !== 'markdown') {
            console.log('[SmartPDF] 마크다운 뷰가 아님');
            return null;
        }

        return view;
    }

    async exportToPdf() {
        try {
            console.log('[SmartPDF] exportToPdf 시작');

            const activeView = this.getActiveMarkdownView();

            if (!activeView) {
                new obsidian.Notice('❌ 내보낼 마크다운 문서를 먼저 열어주세요.');
                console.log('[SmartPDF] 마크다운 뷰를 찾을 수 없음');
                return;
            }

            // 파일 정보 가져오기
            let currentFile = activeView.file;
            
            if (!currentFile) {
                currentFile = this.app.workspace.getActiveFile();
            }
            
            if (!currentFile) {
                new obsidian.Notice('❌ 파일 정보를 가져올 수 없습니다.');
                console.log('[SmartPDF] 파일 정보 없음');
                return;
            }

            const pdfFileName = currentFile.basename + '.pdf';
            console.log('[SmartPDF] 파일명:', pdfFileName);

            if (obsidian.Platform.isDesktop) {
                console.log('[SmartPDF] 데스크톱 모드로 내보내기');
                await this.exportDesktop();
            } else {
                console.log('[SmartPDF] 모바일 모드로 내보내기');
                // 현재 파일의 부모 폴더 경로를 전달하여 같은 폴더에 저장
                const folderPath = currentFile.parent ? currentFile.parent.path : '';
                await this.exportMobile(activeView, pdfFileName, folderPath);
            }

        } catch (error) {
            console.error('[SmartPDF] exportToPdf 에러:', error);
            new obsidian.Notice('❌ PDF 내보내기 중 오류 발생: ' + error.message);
        }
    }

    /**
     * 데스크톱용 PDF 내보내기
     * Obsidian의 내장 PDF 내보내기 다이얼로그를 사용합니다.
     */
    async exportDesktop() {
        try {
            console.log('[SmartPDF] 데스크톱 PDF 내보내기 시작');
            
            const commandId = 'workspace:export-pdf';
            const result = await this.app.commands.executeCommandById(commandId);
            console.log('[SmartPDF] PDF 내보내기 명령어 실행 결과:', result);
            
        } catch (error) {
            console.error('[SmartPDF] 데스크톱 PDF 내보내기 실패:', error);
            new obsidian.Notice('❌ PDF 내보내기에 실패했습니다: ' + error.message);
        }
    }

    /**
     * 모바일용 PDF 내보내기 (v1.0.3에서 대폭 수정)
     * 
     * 핵심 변경사항:
     * - html2pdf.save() 대신 outputPdf('blob')으로 PDF 데이터를 가져옴
     * - Obsidian의 app.vault.createBinary() API로 Vault 내부에 직접 저장
     * - 이렇게 하면 Android WebView에서도 파일이 정상적으로 저장됨
     * 
     * @param view - 현재 마크다운 뷰
     * @param fileName - 저장할 PDF 파일명 (예: "문서.pdf")
     * @param folderPath - 저장할 폴더 경로 (원본 md 파일과 같은 폴더)
     */
    async exportMobile(view, fileName, folderPath) {
        try {
            new obsidian.Notice('📄 PDF 생성 중... 잠시만 기다려주세요.');
            console.log('[SmartPDF] 모바일 PDF 생성 시작');
            console.log('[SmartPDF] 저장 폴더:', folderPath);
            console.log('[SmartPDF] 파일명:', fileName);

            // 1단계: html2pdf.js 라이브러리 로드
            await loadHtml2Pdf();
            console.log('[SmartPDF] 라이브러리 로드 완료');

            // 2단계: 렌더링된 마크다운 콘텐츠 가져오기
            const contentEl = this.getRenderedContent(view);

            if (!contentEl) {
                new obsidian.Notice('❌ 문서 내용을 가져올 수 없습니다. Reading View로 전환 후 다시 시도해주세요.');
                return;
            }
            console.log('[SmartPDF] 콘텐츠 가져오기 완료');

            // 3단계: PDF 생성을 위한 임시 컨테이너 준비
            const container = await this.prepareContentForPdf(contentEl);
            console.log('[SmartPDF] 컨테이너 준비 완료');

            // 4단계: html2pdf.js 옵션 설정
            const options = {
                margin: [10, 10, 10, 10],
                filename: fileName,
                image: { 
                    type: 'jpeg', 
                    quality: 0.95
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                },
                pagebreak: { 
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.page-break-before',
                    after: '.page-break-after',
                    avoid: '.callout'
                }
            };

            // 5단계: PDF를 Blob으로 생성 (⭐ 핵심 변경: save() 대신 outputPdf 사용)
            console.log('[SmartPDF] PDF 생성 중...');
            const pdfBlob = await html2pdf()
                .set(options)
                .from(container)
                .outputPdf('blob');
            
            console.log('[SmartPDF] PDF Blob 생성 완료, 크기:', pdfBlob.size, 'bytes');

            // 6단계: Blob을 ArrayBuffer로 변환
            const arrayBuffer = await pdfBlob.arrayBuffer();
            console.log('[SmartPDF] ArrayBuffer 변환 완료');

            // 7단계: 저장 경로 결정 (원본 파일과 같은 폴더에 저장)
            const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
            console.log('[SmartPDF] 최종 저장 경로:', fullPath);

            // 8단계: 이미 같은 이름의 파일이 있는지 확인
            const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
            
            if (existingFile) {
                // 기존 파일이 있으면 삭제 후 새로 생성 (덮어쓰기)
                console.log('[SmartPDF] 기존 파일 발견, 덮어쓰기 진행');
                await this.app.vault.delete(existingFile);
            }

            // 9단계: Vault에 PDF 파일 저장 (⭐ 핵심: Obsidian API 사용)
            await this.app.vault.createBinary(fullPath, arrayBuffer);
            console.log('[SmartPDF] Vault에 파일 저장 완료');

            // 10단계: 임시 컨테이너 정리
            container.remove();

            // 성공 메시지
            new obsidian.Notice(`✅ PDF 저장 완료!\n📁 ${fullPath}`);
            console.log('[SmartPDF] 모바일 PDF 내보내기 성공:', fullPath);

        } catch (error) {
            console.error('[SmartPDF] 모바일 PDF 내보내기 실패:', error);
            console.error('[SmartPDF] 에러 스택:', error.stack);
            new obsidian.Notice('❌ PDF 생성 실패: ' + error.message);
        }
    }

    /**
     * MarkdownView에서 렌더링된 HTML 콘텐츠를 가져옵니다.
     * Reading View와 Live Preview 모드를 모두 지원합니다.
     */
    getRenderedContent(view) {
        try {
            if (!view || !view.contentEl) {
                console.log('[SmartPDF] view.contentEl 없음');
                return null;
            }

            // 우선순위 1: Reading View (가장 깔끔한 렌더링)
            const previewEl = view.contentEl.querySelector('.markdown-preview-view');
            if (previewEl) {
                console.log('[SmartPDF] Reading View 콘텐츠 발견');
                return previewEl;
            }

            // 우선순위 2: Live Preview 모드
            const livePreviewEl = view.contentEl.querySelector('.cm-content');
            if (livePreviewEl) {
                console.log('[SmartPDF] Live Preview 콘텐츠 발견');
                return view.contentEl;
            }

            // 폴백: 전체 contentEl
            console.log('[SmartPDF] 폴백: 전체 contentEl 사용');
            return view.contentEl;
            
        } catch (error) {
            console.error('[SmartPDF] getRenderedContent 에러:', error);
            return null;
        }
    }

    /**
     * PDF 생성을 위해 콘텐츠를 준비합니다.
     * 원본 DOM을 복제하고, PDF에 적합하도록 스타일을 조정합니다.
     */
    async prepareContentForPdf(sourceEl) {
        // 원본 DOM 복제 (원본을 건드리지 않음)
        const container = document.createElement('div');
        container.innerHTML = sourceEl.innerHTML;

        // PDF용 기본 스타일 적용
        container.style.cssText = `
            width: 210mm;
            padding: 20px;
            background: white;
            color: black;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
        `;

        // Callout 블록에 페이지 분리 방지 스타일 추가
        const callouts = container.querySelectorAll('.callout');
        callouts.forEach((callout) => {
            callout.style.cssText += `
                break-inside: avoid;
                page-break-inside: avoid;
                display: block;
                margin-bottom: 1em;
            `;
        });

        // 이미지 크기 제한 (페이지를 넘지 않도록)
        const images = container.querySelectorAll('img');
        images.forEach((img) => {
            img.style.cssText += `
                max-width: 100%;
                max-height: 250mm;
                break-inside: avoid;
                page-break-inside: avoid;
            `;
        });

        // 코드 블록 줄바꿈 처리
        const codeBlocks = container.querySelectorAll('pre, code');
        codeBlocks.forEach((block) => {
            block.style.cssText += `
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
        });

        // 화면 밖에 임시 배치 (렌더링을 위해 DOM에 있어야 함)
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);

        // 이미지 로딩 대기
        await this.waitForImages(container);

        return container;
    }

    /**
     * 컨테이너 내의 모든 이미지가 로드될 때까지 대기합니다.
     * 이미지가 로드되지 않은 상태로 PDF를 생성하면 이미지가 누락됩니다.
     */
    async waitForImages(container) {
        const images = container.querySelectorAll('img');
        
        if (images.length === 0) return;

        console.log('[SmartPDF] 이미지 로딩 대기 중...', images.length, '개');

        const imagePromises = Array.from(images).map((img) => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.addEventListener('load', () => resolve());
                    img.addEventListener('error', () => resolve()); // 에러가 나도 계속 진행
                }
            });
        });

        // 최대 10초까지만 대기 (모바일은 네트워크가 느릴 수 있음)
        await Promise.race([
            Promise.all(imagePromises),
            new Promise(resolve => setTimeout(resolve, 10000))
        ]);

        console.log('[SmartPDF] 이미지 로딩 완료');
    }
}

module.exports = SmartPdfPlugin;
