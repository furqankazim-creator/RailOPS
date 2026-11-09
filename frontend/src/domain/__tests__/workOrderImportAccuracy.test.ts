import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-js-style';

import { WORK_ORDER_COLUMNS } from '../workOrderColumns';
import { parseWorkOrdersWorkbook } from '../workload';
import { computeWorkload, workOrderShift } from '../workloadLive';

function makeWorkbook(rows: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('Work Order Import Accuracy Verification', () => {
  it('accurately imports all client columns, dates, lines, shifts, and preserves exact row order', () => {
    const headers = [
      'Work Order',
      'Description',
      'Work Type',
      'Teams',
      'Location',
      'Asset',
      'Status',
      'Reported Date',
      'Start No Earlier Than',
      'Target Start',
      'Scheduled Start',
      'Finish No Later Than',
      'Target Finish',
      'Scheduled Finish',
      'Division',
      'Department',
      'Line',
      'Asset Group',
      'Activity can be Perform\nM/E/N/Anytime',
      'new Required Manpower for PM',
      'location',
    ];

    const dataRows = [
      // Row 1: Line 5 PM, Anytime, 2 manpower, date 2026-08-25
      [
        13295117,
        'Train 512, DCS, 12 Monthly Maintenance',
        'PM',
        '',
        'L5-MV-512',
        107764,
        'APPR',
        '2026-06-17 00:43:29',
        '2026-07-25 16:00:00',
        '2026-08-16 00:00:00',
        '2026-08-25 01:00:00',
        '2026-09-06 23:43:00',
        '2026-08-16 15:43:00',
        '2026-08-25 02:45:00',
        'TSM',
        'SLV',
        'L5',
        'DCS',
        'Anytime',
        2,
        'NaN',
      ],
      // Row 2: Line 6 PM, Night shift (N), 2 manpower, date 2026-08-26
      [
        13328697,
        '6F1, ISM, 1 Monthly Maintenance',
        'PM',
        'Team 1',
        'L6-IP-6F1',
        '',
        'APPR',
        '2026-06-25 00:49:05',
        '2026-08-06 01:00:00',
        '2026-08-09 01:00:00',
        '2026-08-26 00:30:00',
        '2026-09-05 03:12:00',
        '2026-09-02 03:12:00',
        '2026-08-26 05:00:00',
        'TSM',
        'SLV',
        'L6',
        'ISM',
        'N',
        2,
        '6F1',
      ],
      // Row 3: Line 4 PM, explicit L4 line, 1 manpower, date 2026-08-27
      [
        13344138,
        'Mainline L6, DCS, Twice Daily Maintenance',
        'PM',
        'Team 1',
        'L4-DP-D70-DF600',
        11321383,
        'APPR',
        '2026-06-29 00:42:47',
        '2026-08-27 07:00:00',
        '2026-08-28 00:00:00',
        '2026-08-27 07:00:00',
        '2026-09-02 17:00:00',
        '2026-09-02 00:00:00',
        '2026-09-02 17:00:00',
        'TSM',
        'SLV',
        'L4',
        'DCS',
        'Anytime',
        1,
        '',
      ],
      // Row 4: Line 4&6 combined format, morning shift (M), date 2026-08-25
      [
        13395286,
        'Section L46 CCTV Maintenance',
        'PM',
        'Team 1',
        'L4-DP-D70',
        103028,
        'APPR',
        '2026-07-14 00:51:58',
        '2026-08-25 00:00:00',
        '2026-08-28 00:00:00',
        '2026-08-25 06:00:00',
        '2026-09-11 01:48:00',
        '2026-09-08 01:48:00',
        '2026-08-25 12:00:00',
        'TSM',
        'SLV',
        'Line 4 & 6',
        'CCT',
        'M',
        2,
        'NaN',
      ],
      // Row 5: Irregular date with AM/PM: 19-08-2026 01:15 AM
      [
        13349821,
        '5B3, ISM, 1 Monthly Maintenance',
        'PM',
        '',
        'L5-IP-5B3-ST',
        105724,
        'APPR',
        '2026-07-01 00:47:15',
        '2026-08-12 01:00:00',
        '2026-08-15 01:00:00',
        '19-08-2026 01:15 AM',
        '2026-09-09 03:00:00',
        '2026-09-06 03:00:00',
        '19-08-2026 03:00:00',
        'TSM',
        'SLV',
        'L5',
        'ISM',
        'N',
        2,
        'NaN',
      ],
      // Row 6: Irregular date without space before hour: 23-08-202601:00 AM
      [
        13387071,
        'L5 CER, TETRA, 12 Monthly Maintenance',
        'PM',
        '',
        'L5-DP-D60',
        12830798,
        'APPR',
        '2026-07-11 00:56:57',
        '2026-08-18 16:00:00',
        '2026-09-09 00:00:00',
        '23-08-202601:00 AM',
        '2026-10-03 09:55:00',
        '2026-09-12 01:55:00',
        '23-08-2026 02:45:00',
        'TSM',
        'SLV',
        'L5',
        'RTS',
        'N',
        2,
        'NaN',
      ],
    ];

    const buf = makeWorkbook([headers, ...dataRows]);
    const res = parseWorkOrdersWorkbook(buf, WORK_ORDER_COLUMNS);

    // 1. Total count check
    expect(res.workOrders).toHaveLength(6);
    expect(res.fileErrors).toEqual([]);

    // 2. Exact row order preserved (order / rowIndex)
    expect(res.workOrders[0].order).toBe(2);
    expect(res.workOrders[0].workOrderId).toBe('13295117');
    expect(res.workOrders[1].order).toBe(3);
    expect(res.workOrders[1].workOrderId).toBe('13328697');
    expect(res.workOrders[2].order).toBe(4);
    expect(res.workOrders[2].workOrderId).toBe('13344138');
    expect(res.workOrders[3].order).toBe(5);
    expect(res.workOrders[3].workOrderId).toBe('13395286');
    expect(res.workOrders[4].order).toBe(6);
    expect(res.workOrders[4].workOrderId).toBe('13349821');
    expect(res.workOrders[5].order).toBe(7);
    expect(res.workOrders[5].workOrderId).toBe('13387071');

    // 3. Line assignments
    expect(res.workOrders[0].line).toBe('L5');
    expect(res.workOrders[1].line).toBe('L6');
    expect(res.workOrders[2].line).toBe('L4');
    expect(res.workOrders[3].line).toBe('L4'); // Line 4 & 6 pool resolves to L4
    expect(res.workOrders[4].line).toBe('L5');
    expect(res.workOrders[5].line).toBe('L5');

    // 4. Date parsing accuracy
    expect(res.workOrders[0].scheduledStart).toBe('2026-08-25');
    expect(res.workOrders[1].scheduledStart).toBe('2026-08-26');
    expect(res.workOrders[2].scheduledStart).toBe('2026-08-27');
    expect(res.workOrders[3].scheduledStart).toBe('2026-08-25');
    expect(res.workOrders[4].scheduledStart).toBe('2026-08-19');
    expect(res.workOrders[5].scheduledStart).toBe('2026-08-23');

    // 5. Shift assignment from "Activity can be Perform M/E/N/Anytime"
    expect(workOrderShift(res.workOrders[1])).toBe('N');
    expect(workOrderShift(res.workOrders[3])).toBe('M');
    expect(workOrderShift(res.workOrders[4])).toBe('N');
    expect(workOrderShift(res.workOrders[5])).toBe('N');

    // 6. Workload live placement: all 6 are placeable on their exact dates
    const workload = computeWorkload({
      workOrders: res.workOrders,
      getRoster: () => null,
      employeesByLine: {
        line4: [{ id: 'e4', name: 'Emp 4', lineId: 'line4', active: true } as any],
        line5: [{ id: 'e5', name: 'Emp 5', lineId: 'line5', active: true } as any],
      },
      codesByLine: {},
      requirements: [],
    });

    for (const wo of res.workOrders) {
      expect(workload.byWo[wo.id].status).not.toBe('UNPLACED');
    }
  });
});
