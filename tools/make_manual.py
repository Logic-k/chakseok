"""붙임1 프로그램 설명서 초안 생성 (교육-팀명붙임1.hwpx).

팀명·개발자 정보는 제출자가 채워야 하므로 빈 칸/밑줄로 둔다.
python-hwpx로 직접 생성 — 한글 2024 호환 검증 포함.
"""
from hwpx.document import HwpxDocument

OUT = "/home/ubuntu/submission/교육-OOOO붙임1_설명서.hwpx"

d = HwpxDocument.new()

TITLE = d.ensure_run_style(bold=True, size=16)
H1 = d.ensure_run_style(bold=True, size=13)
H2 = d.ensure_run_style(bold=True, size=11)
BODY = d.ensure_run_style(size=10)
BOLD = d.ensure_run_style(bold=True, size=10)
SMALL = d.ensure_run_style(size=9)
GRAY = d.ensure_run_style(size=9, color="#555555")


def para(text="", ch=BODY, align=None, before=0.0, after=4.0):
    p = d.add_paragraph(text, char_pr_id_ref=ch)
    if align:
        d.set_paragraph_format(paragraph_index=d.paragraphs.index(p), alignment=align,
                               spacing_before_pt=before, spacing_after_pt=after)
    elif before or after:
        d.set_paragraph_format(paragraph_index=d.paragraphs.index(p),
                               spacing_before_pt=before, spacing_after_pt=after)
    return p


def table(rows, cols, widths=None):
    t = d.add_table(rows, cols, width=42520)
    if widths:
        t.set_column_widths(widths)
    return t


para("프로그램 설명서", TITLE, "CENTER", after=2)
para("[붙임 1] 2026년 업무자동화 프로그램 개발대회", GRAY, "CENTER", after=14)

# ── 신상 정보 표 ─────────────────────────────────────────────
t = table(5, 4, [3, 8, 2, 8])
info = [
    ("접수번호", "(제출 시 기재하지 않음)", "", ""),
    ("프로그램명", "착석(CHAKSEOK)", "과제번호", "교육-003"),
    ("분야", "☑ 교육    ☐ 행정", "", ""),
    ("팀명", "(5자 이내)                              ", "", ""),
    ("개발자(참가자)", "기관/부서명:                성명:              \n역할:              직위:              연락처:              □ 대표", "", ""),
]
for r, (a, b, c, e) in enumerate(info):
    t.set_cell_text(r, 0, a)
    t.set_cell_text(r, 1, b)
    if c:
        t.set_cell_text(r, 2, c)
        t.set_cell_text(r, 3, e)
    else:
        t.merge_cells(r, 1, r, 3)
para("", SMALL, after=10)

# ── I. 프로그램 개발 현황 ────────────────────────────────────
para("Ⅰ. 프로그램 개발 현황", H1, before=6)

para("1. 사용 기술", H2, before=4)
for line in [
    "• 개발 언어 및 도구: TypeScript(React 19 + Vite) 프런트엔드, Rust(Tauri 2) 데스크톱 셸, Vitest 테스트",
    "• 프로그램 구성 및 아키텍처: 단일 실행 파일형 데스크톱 앱. UI(React) → 상태관리(Zustand, 로컬 저장) → 배치 엔진(제약 기반 그리디 + 난수 시드) → 문서 생성 엔진(PDF·HWPX·DOCX·XLSX)의 4계층 구조. 네트워크 호출 일절 없음(CSP connect-src 'none').",
    "• 실행 환경: Windows 11 64bit(Windows 10 이상 지원). 단일 설치파일(.msi 또는 .exe)로 설치, 설치 후 즉시 사용. 관리자 권한 불필요.",
    "• 입력 형식: Excel .xlsx / .csv 학생 명렬표(학년·반·번호·성명 열 자동 인식, 나머지 열은 선택과목으로 자동 분류), 프로젝트 파일 .chakseok.json",
    "• 출력 형식: PDF(좌석배치도·학생별 시간표·출석부), 한글 .hwpx, 워드 .docx, 엑셀 통합본 .xlsx, 전체 묶음 .zip",
    "• 주요 오류 조치: 좌석 부족·명렬표 누락 열·중복 학번 등은 화면에 경고로 즉시 안내. 배치 불가 학생은 미배정 목록으로 별도 표시.",
    "• 수정 가능 설정값: 배치 방식(번호순/반 섞기/과목 분산/무작위), 채우기 순서, 난수 시드, 고사실 행×열, 사용 불가 좌석, 이름 마스킹 여부",
    "• 외부 시스템/기능: 없음 — 100% 오프라인, 어떤 데이터도 외부로 전송하지 않음(기관 승인 없는 업무자료 외부 전송 금지 조건 충족)",
]:
    para(line, BODY, after=2)

para("2. 외부 라이브러리·모듈 및 라이선스", H2, before=4)
t = table(11, 3, [6, 12, 4])
lib = [
    ("구성요소", "용도", "라이선스"),
    ("Tauri 2 (Rust)", "데스크톱 앱 셸·설치파일 생성", "MIT/Apache-2.0"),
    ("React 19", "사용자 인터페이스", "MIT"),
    ("Vite 7 / TypeScript", "빌드·개발 도구", "MIT"),
    ("Tailwind CSS 4", "화면 스타일", "MIT"),
    ("SheetJS (xlsx)", "엑셀 파일 읽기·쓰기", "Apache-2.0"),
    ("pdf-lib + fontkit", "PDF 문서 생성·한글 폰트 임베딩", "MIT"),
    ("docx", "워드 문서 생성", "MIT"),
    ("JSZip", "한글(.hwpx) 패키지 생성", "MIT"),
    ("Pretendard (글꼴)", "UI·PDF 한글 글꼴", "SIL OFL 1.1"),
    ("Zustand · lucide-react", "상태관리 · 아이콘", "MIT · ISC"),
]
for r, (a, b, c) in enumerate(lib):
    t.set_cell_text(r, 0, a)
    t.set_cell_text(r, 1, b)
    t.set_cell_text(r, 2, c)
para("모든 구성요소는 무상 배포·사용이 가능한 라이선스이며, 소스코드 전체를 함께 제출합니다.", SMALL, before=2, after=10)

para("3. 프로그램 간단 설명서", H2, before=4)
for line in [
    "설치: 배포된 '착석' 설치파일(.msi 또는 .exe)을 실행해 안내에 따라 설치 → 바탕화면/시작메뉴에서 실행.",
    "",
    "① 명렬표: 학생 명렬표 엑셀/CSV를 끌어다 놓기(학년·반·번호·성명 자동 인식). 또는 '시연용 가상 명단 생성'으로 바로 체험.",
    "② 시험·과목: 시험명·날짜 입력 후 교시별로 '공통 과목' 또는 '선택과목(학생별 상이)' 지정.",
    "③ 고사실: 고사실 추가 → 행×열 크기 지정, 좌석을 클릭해 사물함·기둥 등 사용 불가 자리 지정, 감독 교사 입력.",
    "④ 배치: 배치 방식 선택 후 [배치 실행]. 결과는 드래그로 좌석 교환, 우클릭으로 학생 고정(재배치 시 유지) 가능. 인접 동반석·동일과목 통계 즉시 표시.",
    "⑤ 출력: 좌석배치도 PDF(고사실 앞 게시용), 학생별 시간표 카드 PDF(절취 배포용), 출석부 PDF(감독용), 한글·워드·엑셀 통합본까지 원클릭 생성. '이름 마스킹'으로 게시용 문서의 개인정보 보호.",
    "",
    "저장·재사용: '프로젝트 저장'으로 전체 설정을 .chakseok.json 파일로 보관 → 다음 시험 때 '프로젝트 열기'로 그대로 재사용(고사실 구성·시간표 재입력 불필요).",
]:
    para(line, BODY, after=2)

# ── II. 현행 업무 및 개선 내용 ───────────────────────────────
para("Ⅱ. 현행 업무 및 개선 내용", H1, before=8)

para("1. 현행 업무 방식", H2, before=4)
for line in [
    "• 중간·기말고사 때마다 교무 담당자가 엑셀에서 학생 명단을 수작업으로 나누어 고사실별 자리배치도를 작성",
    "• 같은 반 학생이 나란히 앉지 않도록 일일이 눈으로 확인하고 자리를 옮기는 반복 작업",
    "• 선택과목(미적분·기하·확률과통계 등)이 다른 학생별 시험 시간표를 학생 수만큼 따로 만들어 인쇄·절취",
    "• 고사실 게시용 좌석도, 감독용 출석부를 문서 프로그램에서 각각 수작업 작성 — 매 시험마다 반나절 이상 소요, 실수 발생 시 전면 재작업",
]:
    para(line, BODY, after=2)

para("2. 프로그램을 이용한 개선 방식 및 기대 효과", H2, before=4)
for line in [
    "• 명렬표 엑셀 업로드 → 배치 규칙 선택 → [배치 실행] → 문서 출력의 5단계로 전 과정 수 분 내 완료",
    "• 반 분산·선택과목 분산·인접 동반 회피 규칙을 알고리즘이 자동 적용하고, 고정 좌석·드래그 조정으로 현장 사정 반영",
    "• 좌석배치도·시간표·출석부를 한글·워드·PDF·엑셀로 동시 생성 — 공문서 편집 관행(한글)과 인쇄·게시(PDF) 모두 지원",
    "• 게시용 출력물에 이름 마스킹(김○연) 적용해 복도 게시 시 개인정보 보호 강화",
    "• 기대 효과: 시험 1회당 좌석 배치·문서 작성 업무 수 시간 → 수 분으로 단축, 배치 오류·누락 원천 제거, 학교 규모·과목 구성과 무관하게 전 학교 공통 사용 가능",
]:
    para(line, BODY, after=2)

import os
os.makedirs("/home/ubuntu/submission", exist_ok=True)
d.save_to_path(OUT)

# 검증
chk = HwpxDocument.open(OUT)
print("paragraphs:", len(chk.paragraphs), "tables:", len(chk.tables))
print("validate:", list(chk.validate()) or "OK")
print("saved:", OUT)
