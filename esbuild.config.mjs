import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

// 프로덕션 빌드인지 확인 (npm run build 시 'production' 인자가 전달됨)
const prod = process.argv[2] === "production";

// esbuild 컨텍스트 생성
const context = await esbuild.context({
    // 진입점: TypeScript 메인 파일
    entryPoints: ["src/main.ts"],
    
    // 번들링 활성화 (모든 import를 하나의 파일로 합침)
    bundle: true,
    
    // 외부 모듈 - 번들에 포함하지 않음
    // Obsidian은 런타임에 이 모듈들을 제공함
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins // Node.js 내장 모듈들
    ],
    
    // 출력 형식: CommonJS (Obsidian이 요구하는 형식)
    format: "cjs",
    
    // 출력 파일 경로 (프로젝트 루트에 main.js 생성)
    outfile: "main.js",
    
    // 타겟 플랫폼: 브라우저 (Electron 기반)
    platform: "browser",
    
    // 소스맵: 개발 환경에서만 인라인으로 포함
    sourcemap: prod ? false : "inline",
    
    // 소스 경로 기준점
    sourceRoot: process.cwd(),
    
    // 프로덕션일 때만 코드 압축
    minify: prod,
    
    // 트리 쉐이킹 (사용하지 않는 코드 제거)
    treeShaking: true,

    // 로그 레벨
    logLevel: "info",
});

if (prod) {
    // 프로덕션: 한 번 빌드하고 종료
    await context.rebuild();
    process.exit(0);
} else {
    // 개발: 파일 변경 감지 모드 (watch mode)
    await context.watch();
    console.log("👀 개발 모드: 파일 변경을 감지하고 있습니다...");
}
