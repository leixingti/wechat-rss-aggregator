/**
 * 生成"数据导出申请表" Word 文档
 * 运行: node generate-export-form.js
 * 输出: 数据导出申请表.docx
 */
const {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  VerticalAlign, ShadingType, UnderlineType
} = require('docx');
const fs = require('fs');

// ── 颜色常量 ──────────────────────────────────────
const COLOR = {
  title:   '1E3A5F',   // 深蓝
  head:    '2563EB',   // 主蓝
  headBg:  'DBEAFE',   // 浅蓝背景
  warn:    '92400E',   // 橙色文字
  warnBg:  'FEF3C7',   // 橙色背景
  border:  'CBD5E1',   // 边框灰
  label:   '374151',   // 标签深灰
  light:   'F8FAFC',   // 超浅灰背景
  sign:    'E5E7EB',   // 签字线灰
  red:     'DC2626',   // 红色（必填星号）
};

// ── 工具函数 ──────────────────────────────────────

/** 普通文本段落 */
function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: opts.after ?? 120 },
    alignment: opts.align ?? AlignmentType.LEFT,
  });
}

/** 标题段落 */
function heading(text, level = 2) {
  return new Paragraph({
    children: [new TextRun({
      text,
      bold: true,
      size: level === 1 ? 36 : 26,
      color: level === 1 ? COLOR.title : COLOR.head,
      font: '黑体',
    })],
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: level === 1 ? 0 : 320, after: 160 },
    border: level === 2 ? {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR.head }
    } : undefined,
  });
}

/** 空行 */
function blank(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [], spacing: { after: 80 } }));
}

/** 注意提示框（带背景色的文字行） */
function tipBox(text, bgColor = COLOR.warnBg, textColor = COLOR.warn) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.SOLID, fill: bgColor },
        borders: allBorder(COLOR.sign),
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [new Paragraph({
          children: [new TextRun({ text, color: textColor, size: 20, font: '微软雅黑' })],
          spacing: { after: 0 },
        })],
      })],
    })],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}

/** 所有边框设置 */
function allBorder(color = COLOR.border, size = 4) {
  const b = { style: BorderStyle.SINGLE, size, color };
  return { top: b, bottom: b, left: b, right: b };
}

/** 通用表单单元格（左=标签，右=填写区） */
function formRow(label, required = false, height = 400, fillHint = '') {
  return new TableRow({
    height: { value: height, rule: 'exact' },
    children: [
      // 标签列
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, fill: COLOR.light },
        borders: allBorder(),
        margins: { top: 80, bottom: 80, left: 160, right: 80 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [
            new TextRun({ text: label, bold: true, size: 20, color: COLOR.label, font: '微软雅黑' }),
            ...(required ? [new TextRun({ text: ' *', bold: true, size: 20, color: COLOR.red })] : []),
          ],
          spacing: { after: 0 },
        })],
      }),
      // 填写列
      new TableCell({
        width: { size: 78, type: WidthType.PERCENTAGE },
        borders: allBorder(),
        margins: { top: 60, bottom: 60, left: 160, right: 80 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: fillHint, color: 'AAAAAA', size: 18, italics: true })],
          spacing: { after: 0 },
        })],
      }),
    ],
  });
}

/** 多行高填写区 */
function formRowTall(label, required = false, rows = 3, fillHint = '') {
  const rowH = rows * 360;
  return formRow(label, required, rowH, fillHint);
}

/** checkbox 行（承诺条款用） */
function checkRow(text, index) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 6, type: WidthType.PERCENTAGE },
        borders: allBorder('FFFFFF', 0),
        margins: { top: 40, bottom: 40, left: 80, right: 40 },
        children: [new Paragraph({
          children: [new TextRun({ text: '☐', size: 22, color: COLOR.head })],
          spacing: { after: 0 },
        })],
      }),
      new TableCell({
        width: { size: 94, type: WidthType.PERCENTAGE },
        borders: allBorder('FFFFFF', 0),
        margins: { top: 40, bottom: 40, left: 40, right: 80 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: `${index}. `, bold: true, size: 20, color: COLOR.head }),
            new TextRun({ text, size: 20, color: COLOR.label, font: '微软雅黑' }),
          ],
          spacing: { after: 0 },
        })],
      }),
    ],
  });
}

/** 审批签字行 */
function signRow(role, dateLabel = '日期') {
  return new TableRow({
    height: { value: 900, rule: 'exact' },
    children: [
      new TableCell({
        borders: allBorder(),
        shading: { type: ShadingType.SOLID, fill: COLOR.light },
        margins: { top: 80, bottom: 80, left: 160, right: 80 },
        verticalAlign: VerticalAlign.TOP,
        children: [
          new Paragraph({ children: [new TextRun({ text: role, bold: true, size: 20, color: COLOR.label, font: '微软雅黑' })], spacing: { after: 0 } }),
          new Paragraph({ children: [], spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: '签字：________________', size: 20, color: '888888' })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `${dateLabel}：________________`, size: 20, color: '888888' })],
            spacing: { after: 0 },
          }),
        ],
      }),
    ],
  });
}

// ── 主文档构建 ────────────────────────────────────
const doc = new Document({
  creator: 'WeChat RSS Aggregator 系统',
  title: '数据导出申请表',
  subject: '数据安全管理 - 数据导出审批',
  styles: {
    default: {
      document: {
        run: { font: '微软雅黑', size: 22, color: '1F2937' },
        paragraph: { spacing: { line: 320 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1080, bottom: 1080, left: 1260, right: 1260 },
      },
    },
    children: [

      // ═══════════════════════════════════════════
      // 封面标题区
      // ═══════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: '数  据  导  出  申  请  表', bold: true, size: 56, color: COLOR.title, font: '黑体' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Data Export Application Form', size: 24, color: '6B7280', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      // 副标题横线
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [new TableCell({
          shading: { type: ShadingType.SOLID, fill: COLOR.head },
          borders: allBorder(COLOR.head, 1),
          children: [new Paragraph({ children: [], spacing: { after: 0 } })],
        })] })],
      }),
      ...blank(1),
      // 表单编号/日期行
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: allBorder('FFFFFF', 0),
              children: [new Paragraph({ children: [new TextRun({ text: '申请编号：_______________', size: 20, color: '6B7280' })], spacing: { after: 0 } })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: allBorder('FFFFFF', 0),
              children: [new Paragraph({ children: [new TextRun({ text: '申请日期：_____ 年 _____ 月 _____ 日', size: 20, color: '6B7280' })], alignment: AlignmentType.RIGHT, spacing: { after: 0 } })],
            }),
          ],
        })],
      }),
      ...blank(1),

      // ═══════════════════════════════════════════
      // 第一部分：申请人信息
      // ═══════════════════════════════════════════
      heading('第一部分：申请人基本信息'),
      tipBox('ℹ  以下信息将被完整记录在导出审计日志中，请务必如实填写。', 'DBEAFE', '1E40AF'),
      ...blank(0.5),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          formRow('申请人姓名', true, 440),
          formRow('所在部门', true, 440),
          formRow('岗位/职务', false, 440),
          formRow('联系电话', false, 440),
          formRow('电子邮箱', false, 440),
          formRow('直属上级', true, 440),
        ],
      }),
      ...blank(1),

      // ═══════════════════════════════════════════
      // 第二部分：数据用途说明
      // ═══════════════════════════════════════════
      heading('第二部分：数据用途说明'),
      tipBox('⚠  数据用途须真实准确，禁止用于申请范围外的任何用途，违规使用将承担相应法律责任。', COLOR.warnBg, COLOR.warn),
      ...blank(0.5),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // 用途类型
          new TableRow({
            height: { value: 520, rule: 'exact' },
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.light },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '用途类型', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' }),
                    new TextRun({ text: ' *', bold: true, size: 20, color: COLOR.red }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '☐ 数据分析与统计   ', size: 20 }),
                    new TextRun({ text: '☐ 运营报表制作   ', size: 20 }),
                    new TextRun({ text: '☐ 技术研究与测试\n', size: 20 }),
                    new TextRun({ text: '☐ 内容合规审查   ', size: 20 }),
                    new TextRun({ text: '☐ 数据备份与归档   ', size: 20 }),
                    new TextRun({ text: '☐ 其他（请说明）', size: 20 }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
            ],
          }),
          formRowTall('具体用途说明', true, 4, '请详细描述本次导出数据的具体使用目的、使用场景及预期成果（不少于20字）...'),
          // 数据使用范围
          new TableRow({
            height: { value: 480, rule: 'exact' },
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.light },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [new TextRun({ text: '数据使用范围', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' })],
                  spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '☐ 本人仅限内部使用   ', size: 20 }),
                    new TextRun({ text: '☐ 团队内部共享   ', size: 20 }),
                    new TextRun({ text: '☐ 形成报告对外汇报', size: 20 }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
            ],
          }),
          formRow('数据保留期限', false, 440, '预计使用完毕时间：____________'),
        ],
      }),
      ...blank(1),

      // ═══════════════════════════════════════════
      // 第三部分：导出要求
      // ═══════════════════════════════════════════
      heading('第三部分：数据导出要求'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // 数据分类
          new TableRow({
            height: { value: 480, rule: 'exact' },
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.light },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '数据分类', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' }),
                    new TextRun({ text: ' *', bold: true, size: 20, color: COLOR.red }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '☐ 全部分类   ', size: 20 }),
                    new TextRun({ text: '☐ 聚焦AI行业（ai_news）   ', size: 20 }),
                    new TextRun({ text: '☐ IT行业新闻（it_news）', size: 20 }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
            ],
          }),
          // 时间范围
          new TableRow({
            height: { value: 440, rule: 'exact' },
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.light },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [new TextRun({ text: '时间范围', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' })],
                  spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [new TextRun({ text: '起始日期：________________  至  截止日期：________________  （不填则不限时间范围）', size: 20 })],
                  spacing: { after: 0 },
                })],
              }),
            ],
          }),
          // 导出字段
          new TableRow({
            height: { value: 680, rule: 'exact' },
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.light },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.TOP,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '导出字段', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' }),
                    new TextRun({ text: ' *', bold: true, size: 20, color: COLOR.red }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '☐ 文章ID（id）   ', size: 20 }),
                      new TextRun({ text: '☐ 标题（title）   ', size: 20 }),
                      new TextRun({ text: '☐ 链接（link）   ', size: 20 }),
                      new TextRun({ text: '☐ 摘要描述（description）', size: 20 }),
                    ],
                    spacing: { after: 80 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: '☐ 发布时间（pubDate）   ', size: 20 }),
                      new TextRun({ text: '☐ 作者（author）   ', size: 20 }),
                      new TextRun({ text: '☐ 来源（source）   ', size: 20 }),
                      new TextRun({ text: '☐ 分类（category）', size: 20 }),
                    ],
                    spacing: { after: 80 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: '☐ 封面图（imageUrl）   ', size: 20 }),
                      new TextRun({ text: '☐ 入库时间（createdAt）   ', size: 20 }),
                      new TextRun({ text: '☐ AI摘要（ai_summary）', size: 20 }),
                    ],
                    spacing: { after: 0 },
                  }),
                ],
              }),
            ],
          }),
          // 导出格式
          new TableRow({
            height: { value: 440, rule: 'exact' },
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.light },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '导出格式', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' }),
                    new TextRun({ text: ' *', bold: true, size: 20, color: COLOR.red }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 80, bottom: 80, left: 160, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: '☐ CSV 格式（兼容 Excel，推荐）   ', size: 20 }),
                    new TextRun({ text: '☐ JSON 格式（结构化数据）', size: 20 }),
                  ],
                  spacing: { after: 0 },
                })],
              }),
            ],
          }),
          formRow('预估数据量', false, 440, '条（可在系统后台预览后填写）'),
          formRowTall('备注说明', false, 2, '其他需要说明的事项...'),
        ],
      }),
      ...blank(1),

      // ═══════════════════════════════════════════
      // 第四部分：数据安全使用承诺书
      // ═══════════════════════════════════════════
      heading('第四部分：数据安全使用承诺书'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [new TableCell({
              borders: allBorder(),
              shading: { type: ShadingType.SOLID, fill: 'FFF7ED' },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '本人申请导出系统中的相关数据，充分了解数据安全管理要求，在此郑重承诺：', size: 20, color: COLOR.label, font: '微软雅黑' })],
                  spacing: { after: 120 },
                }),
              ],
            })],
          }),
          checkRow('本次数据导出仅用于所申请的正当用途，不得擅自扩大使用范围；', 1),
          checkRow('未经授权，不得将导出数据转让、出售或以任何形式提供给任何第三方；', 2),
          checkRow('导出数据须妥善保管，采取必要的技术措施（如加密存储）防止数据泄露；', 3),
          checkRow('数据使用完毕后，应及时删除本地副本，不得超期留存；', 4),
          checkRow('如发现数据泄露或异常访问风险，须立即向系统管理员报告；', 5),
          checkRow('本人对使用导出数据的一切行为承担相应的法律和内部管理责任；', 6),
          checkRow('本次导出操作将被系统完整记录，用于安全审计，本人接受审查。', 7),
          new TableRow({
            children: [new TableCell({
              borders: allBorder(),
              shading: { type: ShadingType.SOLID, fill: 'FFF7ED' },
              margins: { top: 80, bottom: 80, left: 200, right: 200 },
              children: [new Paragraph({
                children: [new TextRun({ text: '违反上述承诺，将依据相关法律法规和内部管理制度追究责任。', bold: true, size: 20, color: '9A3412', font: '微软雅黑' })],
                spacing: { after: 0 },
              })],
            })],
          }),
        ],
      }),
      ...blank(1),

      // ═══════════════════════════════════════════
      // 第五部分：审批意见
      // ═══════════════════════════════════════════
      heading('第五部分：审批意见'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // 表头
          new TableRow({
            children: [
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.headBg },
                borders: allBorder(COLOR.head, 6),
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: '申请人确认', bold: true, size: 20, color: COLOR.head, font: '微软雅黑' })],
                  alignment: AlignmentType.CENTER, spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 34, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.headBg },
                borders: allBorder(COLOR.head, 6),
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: '部门负责人审批', bold: true, size: 20, color: COLOR.head, font: '微软雅黑' })],
                  alignment: AlignmentType.CENTER, spacing: { after: 0 },
                })],
              }),
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, fill: COLOR.headBg },
                borders: allBorder(COLOR.head, 6),
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: '系统管理员执行', bold: true, size: 20, color: COLOR.head, font: '微软雅黑' })],
                  alignment: AlignmentType.CENTER, spacing: { after: 0 },
                })],
              }),
            ],
          }),
          // 签字区
          new TableRow({
            height: { value: 1600, rule: 'exact' },
            children: [
              // 申请人确认
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 120, bottom: 120, left: 160, right: 120 },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({ children: [new TextRun({ text: '本人确认以上填写信息属实，已阅读并承诺遵守《数据安全使用承诺书》中全部条款。', size: 18, color: '6B7280', font: '微软雅黑' })], spacing: { after: 320 } }),
                  new Paragraph({ children: [new TextRun({ text: '申请人签字：', size: 20 })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '______________________', size: 20, color: COLOR.sign })], spacing: { after: 200 } }),
                  new Paragraph({ children: [new TextRun({ text: '日期：______年____月____日', size: 20 })], spacing: { after: 0 } }),
                ],
              }),
              // 部门负责人
              new TableCell({
                width: { size: 34, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 120, bottom: 120, left: 160, right: 120 },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({ children: [new TextRun({ text: '审批意见：', size: 20, bold: true })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '☐ 同意导出   ☐ 不同意', size: 20 })], spacing: { after: 200 } }),
                  new Paragraph({ children: [new TextRun({ text: '审批备注：', size: 18, color: '6B7280' })], spacing: { after: 40 } }),
                  new Paragraph({ children: [new TextRun({ text: '______________________', size: 20, color: COLOR.sign })], spacing: { after: 200 } }),
                  new Paragraph({ children: [new TextRun({ text: '负责人签字：', size: 20 })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '______________________', size: 20, color: COLOR.sign })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '日期：______年____月____日', size: 20 })], spacing: { after: 0 } }),
                ],
              }),
              // 系统管理员
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                borders: allBorder(),
                margins: { top: 120, bottom: 120, left: 160, right: 120 },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({ children: [new TextRun({ text: '执行操作：', size: 20, bold: true })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '☐ 已执行导出   ☐ 拒绝执行', size: 20 })], spacing: { after: 200 } }),
                  new Paragraph({ children: [new TextRun({ text: '执行说明：', size: 18, color: '6B7280' })], spacing: { after: 40 } }),
                  new Paragraph({ children: [new TextRun({ text: '______________________', size: 20, color: COLOR.sign })], spacing: { after: 200 } }),
                  new Paragraph({ children: [new TextRun({ text: '管理员签字：', size: 20 })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '______________________', size: 20, color: COLOR.sign })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '日期：______年____月____日', size: 20 })], spacing: { after: 0 } }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...blank(1),

      // ═══════════════════════════════════════════
      // 底部说明
      // ═══════════════════════════════════════════
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [new TableCell({
            shading: { type: ShadingType.SOLID, fill: 'F1F5F9' },
            borders: allBorder(COLOR.border),
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({ children: [new TextRun({ text: '注意事项：', bold: true, size: 20, color: COLOR.label, font: '微软雅黑' })], spacing: { after: 80 } }),
              new Paragraph({ children: [new TextRun({ text: '1. 本申请表须由申请人填写完整后，提交部门负责人审批。', size: 18, color: '6B7280' })], spacing: { after: 60 } }),
              new Paragraph({ children: [new TextRun({ text: '2. 部门负责人审批通过后，将本表转交系统管理员执行导出操作。', size: 18, color: '6B7280' })], spacing: { after: 60 } }),
              new Paragraph({ children: [new TextRun({ text: '3. 系统管理员须在后台导出审批日志中记录本次操作，留存审计凭证。', size: 18, color: '6B7280' })], spacing: { after: 60 } }),
              new Paragraph({ children: [new TextRun({ text: '4. 本申请表须归档保存，保留期限不少于 12 个月。', size: 18, color: '6B7280' })], spacing: { after: 0 } }),
            ],
          })],
        })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `本表由 WeChat RSS Aggregator 系统生成  |  生成时间：${new Date().toLocaleDateString('zh-CN')}`, size: 16, color: 'AAAAAA', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 0 },
      }),
    ],
  }],
});

// ── 输出文件 ─────────────────────────────────────
const OUTPUT = '数据导出申请表.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`✅ 已生成：${OUTPUT}  (${(buffer.length / 1024).toFixed(1)} KB)`);
}).catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
