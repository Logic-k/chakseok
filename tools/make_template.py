"""착석 템플릿 .hwpx 생성 — header.xml에 필요한 charPr/paraPr를 등록하고
JS 런타임이 section0.xml만 교체해 문서를 생성할 수 있게 한다."""
from hwpx.document import HwpxDocument

d = HwpxDocument.new()

ids = {}

# charPr: 텍스트 스타일
ids["char_title"]   = d.ensure_run_style(bold=True, size=14)
ids["char_h2"]      = d.ensure_run_style(bold=True, size=12)
ids["char_bold"]    = d.ensure_run_style(bold=True, size=10)
ids["char_body"]    = d.ensure_run_style(size=10)
ids["char_small"]   = d.ensure_run_style(size=8, color="#6B7280")
ids["char_accent"]  = d.ensure_run_style(bold=True, size=10, color="#1C5CB8")

# paraPr: 정렬 — 임시 문단에 적용해 새 paraPr id 획득
def make_para(**kw):
    p = d.add_paragraph("")
    res = d.styles.apply_paragraph_format(paragraphs=[p], **kw)
    # res contains created para_pr id — inspect
    return p, res

p_left, r_left = make_para(alignment="LEFT")
p_center, r_center = make_para(alignment="CENTER")
p_justify, r_justify = make_para(alignment="JUSTIFY")
print("left:", r_left)
print("center:", r_center)
print("justify:", r_justify)

# 테두리 없는 표용 borderFill + 기본 표 borderFill 확인
print("border_fills:", d.styles.border_fills)

import zipfile
d.save_to_path("/home/ubuntu/repos/chakseok/src/assets/template.hwpx")
print("saved")
