import { describe, it, expect, assert } from 'vitest';

import { parseFaaNotam } from './faa-notam-parser.js';

// ---------------------------------------------------------------------------
// Sample FAA domestic NOTAMs - taken from real FAA NOTAM data for KATL, KBOS,
// KANC, and KHNL airports.
// ---------------------------------------------------------------------------

// -- NOTAM D (Facility-issued) samples --

// NAV - ILS out of service at Atlanta (from KATL)
const ATL_NAV_ILS = '!ATL 03/296 ATL NAV ILS RWY 08L IM U/S 2603181657-2711082111EST';

// OBST - Crane at Atlanta (from KATL)
const ATL_OBST_CRANE =
  '!ATL 03/437 ATL OBST CRANE (ASN 2025-ASO-10025-NRA) 333744N0842609W (0.6NM SW ATL) 1152FT (155FT AGL) FLAGGED AND LGTD 2603311951-2608311200';

// AIRSPACE - UAS at Atlanta (from KATL)
const ATL_AIRSPACE_UAS = [
  '!ATL 04/024 ATL AIRSPACE NUMEROUS UAS WI AN AREA DEFINED AS .1NM RADIUS OF',
  '333328N0842456W (5.3NM SE ATL) SFC-300FT AGL 2604111600-2604120200',
].join('\n');

// AIRSPACE - Controlled burn at Atlanta (from KATL)
const ATL_AIRSPACE_BURN =
  '!ATL 03/213 ATL AIRSPACE CONTROLLED BURN WI AN AREA DEFINED AS .5NM RADIUS OF ATL SFC-2000FT AGL 2603121638-2611191700';

// RWY - Runway closure at Anchorage (from KANC)
const ANC_RWY_CLOSURE = '!ANC 04/030 ANC RWY 07R/25L CLSD EXC XNG 2604120730-2604121430';

// TWY - Taxiway closure at Anchorage (from KANC)
const ANC_TWY_CLOSURE =
  '!ANC 12/228 ANC TWY Q, TWY R BTN ALASKA CARGO PORT RAMP AND TWY Q CLSD 2512111503-2605312200';

// TWY - Taxiway sign at Anchorage (from KANC)
const ANC_TWY_SIGN =
  '!ANC 03/097 ANC TWY E LOCATION SIGN BTN REMOTE APN SPOT R12 AND REMOTE APN SPOT R11 MISSING 2603080745-2607312359EST';

// RWY - Sequenced flashing lights at Boston (from KBOS)
const BOS_RWY_FLG_LGT = '!BOS 01/514 BOS RWY 22L SEQUENCED FLG LGT U/S 2601161311-2701272359';

// TWY - Taxiway sign at Boston (from KBOS)
const BOS_TWY_SIGN = '!BOS 04/084 BOS TWY C APN SIGN LGT U/S 2604040835-2605092359';

// RWY - Runway closure with exception at Boston (from KBOS)
const BOS_RWY_CLSD_TAX =
  '!BOS 04/086 BOS RWY 15L/33R CLSD EXC TAX 30MIN PPR 131.1 2604041341-2604302359';

// OBST - Crane at Boston (from KBOS)
const BOS_OBST_CRANE =
  '!BOS 02/183 BOS OBST CRANE (ASN 2025-ANE-1558-NRA) 422208N0710112W (0.7NM WNW BOS) 183FT (170FT AGL) FLAGGED AND LGTD 2602041245-2612312359';

// OBST - Tower light at Boston (from KBOS)
const BOS_OBST_TOWER =
  '!BOS 03/244 BOS OBST TOWER LGT (ASR 1261031) 421421.80N0705752.60W (7.7NM SSE BOS) 365.8FT (358.9FT AGL) U/S 2603121246-2610152359';

// SVC at Boston (from KBOS)
const BOS_SVC = '!BOS 04/046 BOS SVC MBST/WS DETECTION SYSTEM NOT AVBL 2604071200-2604071900';

// AIRSPACE - UAS at Boston (from KBOS)
const BOS_AIRSPACE_UAS =
  '!BOS 01/502 BOS AIRSPACE UAS WI AN AREA DEFINED AS .5NM RADIUS OF 421722N0712148W (9.5NM NW OWD) SFC-400FT AGL 2601190001-2607312359';

// OBST - Stack at Boston (from KBOS)
const BOS_OBST_STACK =
  '!BOS 01/119 BOS OBST STACK (ASN UNKNOWN) 422326N0710354W (1.9NM W BOS) 550FT (500FT AGL) LGTD 2601051318-2606052359';

// APRON at Boston (from KBOS)
const BOS_APRON =
  '!BOS 04/099 BOS APRON J PAD PRKG RAMP CLSD EXC ACFT PRKG OVERNIGHT 30MIN PPR 617-561-1919 2604060009-2604061600';

// AD at Boston (from KBOS)
const BOS_AD = '!BOS 04/076 BOS AD AP RVR ALL U/S 2604061200-2604061800';

// NAV at Honolulu (from KHNL)
const HNL_NAV_ILS = '!HNL 02/027 HNL NAV ILS RWY 08L OM U/S 2602021357-2703052111EST';

// RWY - Declared distances change (permanent, from KHNL)
const HNL_RWY_PERM = [
  '!HNL 05/347 HNL RWY 04R/22L CHANGED TO 9002FT X 150FT. DECLARED DIST: RWY 04R TORA',
  '9002FT TODA 9002FT ASDA 8950FT LDA 8950FT. RWY 22L TORA 9002FT TODA 9002FT ASDA 8937FT',
  'LDA 8937FT. 2505241947-PERM',
].join('\n');

// AD - Airport closure at Honolulu (from KHNL)
const HNL_AD_CLSD = '!HNL 03/363 HNL AD AP CLSD TO V-22 VTOL 2603211823-2612311800';

// COM at Anchorage (KANC) - PAPI
const ANC_RWY_PAPI = '!ANC 03/327 ANC RWY 25R PAPI U/S 2603271228-2604181500EST';

// RWY at Anchorage - closure with exception (from KANC)
const ANC_RWY_CLSD_XNG = '!ANC 04/027 ANC RWY 07R/25L CLSD EXC XNG 2604090730-2604091430';

// APRON at Anchorage (from KANC)
const ANC_APRON_FICON = [
  '!ANC 04/026 ANC APRON ALL FICON  PATCHY ICE AND  PATCHY WET OBS AT 2604051041.',
  '2604051041-2604061041',
].join('\n');

// APRON with remote spots at Anchorage (from KANC)
const ANC_APRON_REMOTE =
  '!ANC 04/034 ANC APRON REMOTE APN SPOT R7, REMOTE APN SPOT R8, REMOTE APN SPOT R9, REMOTE APN SPOT R10 CLSD 2604052222-2604060801';

// RWY at Boston - closure with multiple parameters (from KBOS)
const BOS_RWY_CLSD_PPR =
  '!BOS 04/101 BOS RWY 04L/22R CLSD EXC TAX 30MIN PPR 617-561-1919 2604060220-2604060900';

// -- Constructed NOTAM D samples for untested keywords and edge cases --

// COM - Communication frequency change
const CONSTRUCTED_COM = '!DCA 06/015 DCA COM CTAF 122.725 CHANGED TO 123.075 2606011400-2607011400';

// VFP - Visual flight procedure
const CONSTRUCTED_VFP = '!LAX 03/042 LAX VFP RIVER VISUAL RWY 13 NA 2603151000-2604151000EST';

// DVA - Diverse vector area
const CONSTRUCTED_DVA =
  '!ORD 05/088 ORD DVA DIVERSE VECTOR AREA NOT AUTHORIZED 2605010600-2606010600';

// ROUTE - Route
const CONSTRUCTED_ROUTE = '!ZNY 02/100 ZNY ROUTE V16 BTN ALB AND GDC NA 2602120800-2603120800EST';

// CHART - Chart update
const CONSTRUCTED_CHART =
  '!FDC 6/9001 JFK CHART IFR ENROUTE LOW ALTITUDE US L1 CORRECTED 2606010000-PERM';

// DATA - Data correction
const CONSTRUCTED_DATA = '!JFK 08/050 JFK DATA ARPT ELEVATION CHANGED TO 14FT 2608010000-PERM';

// SPECIAL - Special notice
const CONSTRUCTED_SPECIAL =
  '!ATL 01/001 ATL SPECIAL SEE FDC NOTAM 6/1234 FOR TFR DETAILS 2601010000-2601312359';

// SECURITY - Security notice
const CONSTRUCTED_SECURITY =
  '!DCA 09/005 DCA SECURITY FRZ IN EFFECT DO NOT ENTER P-56 2609011200-2609021200';

// 4-character accountability (CARF)
const CONSTRUCTED_CARF =
  '!CARF 09/059 ZAB AIRSPACE STNR ALT RESERVATION WI AN AREA DEFINED AS TXO275034 TO TXO358009 FL190-FL220 2609140200-2609142330';

// 4-character accountability (SUAE)
const CONSTRUCTED_SUAE = '!SUAE 03/010 ZNY AIRSPACE R5206 ACT SFC-5000FT 2603141000-2603150400';

// GPS accountability
const CONSTRUCTED_GPS =
  '!GPS 04/001 ZAB NAV GPS (NAFC GPS 15-01 E1) MAY NOT BE AVBL WI 468NM RADIUS CENTERED AT 330702N1062540W FL400-UNL 2604060400-2604081000';

// Pointer NOTAM - accountability differs from location, references another NOTAM
const CONSTRUCTED_POINTER =
  '!VUJ 05/023 VUJ SVC SEE ZTL 05/754 STANLY APP CLSD 2605011700-2605170200';

// Alphanumeric airport identifier (digit-first, like real FAA ID 8I1)
const CONSTRUCTED_ALPHANUM_LOC =
  '!8I1 03/001 8I1 AD AP CLSD DUE TO CONSTRUCTION 2603010800-2603151800';

// Body text containing a 10-digit number that looks like a date (should not confuse parser)
const CONSTRUCTED_BODY_WITH_DIGITS =
  '!ATL 03/100 ATL OBST CRANE (ASR 1044148) 333557.80N0842853.79W MSL 1336FT 2603121406-2604261406';

// FDC NOTAM with \r\n line endings
const FDC_CRLF =
  '!FDC 5/1234 ATL IAP HARTSFIELD/JACKSON ATLANTA INTL, ATLANTA, GA.\r\nILS RWY 27L AMDT 20.\r\n2510011000-2610011000EST';

// NOTAM with leading/trailing whitespace
const NOTAM_WITH_WHITESPACE =
  '   !ATL 03/296 ATL NAV ILS RWY 08L IM U/S 2603181657-2711082111EST   ';

// FDC NOTAM where airport info doesn't match the expected pattern (no period-terminated location)
const FDC_NO_AIRPORT_MATCH =
  '!FDC 6/5468 HNL STAR DANIEL K. INOUYE INTL AIRPORT HONOLULU HI KLANI FOUR ARRIVAL NOT AUTHORIZED 2603290605-2612310959';

// -- FDC NOTAM samples --

// FDC IAP at Atlanta (from KATL)
const FDC_ATL_IAP = [
  '!FDC 5/3374 ATL IAP HARTSFIELD/JACKSON ATLANTA INTL, ATLANTA, GA.',
  'ILS PRM RWY 10 (CAT II-III), AMDT 5 ...',
  'ILS RWY 10 (CAT II-III), AMDT 5C ...',
  'NOTE FOR CAT III: LOCALIZER NOT SUITABLE FOR ELECTRONIC ROLLOUT GUIDANCE.',
  '2512021812-2712021809EST',
].join('\n');

// FDC STAR at Boston (from KBOS)
const FDC_BOS_STAR = [
  '!FDC 5/6022 BOS STAR GENERAL EDWARD LAWRENCE LOGAN INTL, BOSTON, MA.',
  'OOSHN FIVE ARRIVAL...',
  'RIFLE ROUTE INCREASE MOCA FROM CUTOX TO CUJKE 1200 TO 1900,',
  'WINDMILL AT 873 OBS (25-077159)',
  '2510301500-PERM',
].join('\n');

// FDC ODP at Boston (from KBOS)
const FDC_BOS_ODP = [
  '!FDC 5/7941 BOS ODP GENERAL EDWARD LAWRENCE LOGAN INTL, BOSTON, MA.',
  'TAKEOFF MINIMUMS AND (OBSTACLE) DEPARTURE PROCEDURES AMDT 15...',
  'NOTE: RWY 04L IN ADDITION TO EXISTING TAKEOFF OBSTACLE NOTES, ADD: TREE 3930 FT FROM',
  'DER, 1367 FT LEFT OF CENTERLINE, 172 FT MSL.',
  '2510081405-2710081405EST',
].join('\n');

// FDC IAP at Anchorage (from KANC)
const FDC_ANC_IAP = [
  '!FDC 5/7504 ANC IAP TED STEVENS ANCHORAGE INTL, ANCHORAGE, AK.',
  'RNAV (GPS) RWY 7L, AMDT 3...',
  'LNAV MDA 620/HAT 492 ALL CATS.',
  '2510281409-2710282359EST',
].join('\n');

// FDC SID at Anchorage (from KANC)
const FDC_ANC_SID = [
  '!FDC 5/2149 ANC SID TED STEVENS ANCHORAGE INTL, ANCHORAGE, AK.',
  'TURNAGAIN EIGHT DEPARTURE...',
  'DEPARTURE PROCEDURE DME REQUIRED EXCEPT FOR ACFT EQUIPPED WITH SUITABLE RNAV SYSTEM WITH GPS.',
  'ENA VOR 348-015 BEYOND 20NM UNUSABLE ALL ALTITUDES.',
  '2508061858-2708081857EST',
].join('\n');

// FDC STAR at Honolulu (from KHNL)
const FDC_HNL_STAR = [
  '!FDC 5/2652 HNL STAR DANIEL K INOUYE INTL AIRPORT, HONOLULU HI.',
  'SHLAE ONE ARRIVAL NOT AUTHORIZED',
  '2512312251-2612312359',
].join('\n');

// FDC IAP at Honolulu (from KHNL)
const FDC_HNL_IAP = [
  '!FDC 6/3770 HNL IAP DANIEL K INOUYE INTL, HONOLULU, HI.',
  'RNAV (GPS) Y RWY 4R, AMDT 3A...',
  'LNAV MDA 540/HAT 532 ALL CATS, VIS CAT C/D 1. VDP NA. TEMPORARY CRANE 235 MSL 2667FT NW',
  'OF HNL AIRPORT (2024-AWP-5290-NRA).',
  '2601151417-2608272355EST',
].join('\n');

// FDC IAP at Atlanta with RNAV procedure (from KATL)
const FDC_ATL_IAP_RNAV = [
  '!FDC 5/8266 ATL IAP HARTSFIELD/JACKSON ATLANTA INTL, ATLANTA, GA.',
  'RNAV (RNP) Z RWY 28, AMDT 1...',
  'RNP 0.11 DA 1315/HAT 317 ALL CATS. RNP 0.30 DA 1382/HAT 384, VIS RVR 2600 ALL CATS.',
  '2510291552-2710291552EST',
].join('\n');

// FDC DVA at Boston (from KBOS)
const FDC_BOS_DVA = [
  '!FDC 5/9664 BOS ODP GENERAL EDWARD LAWRENCE LOGAN INTL, BOSTON, MA.',
  'DIVERSE VECTOR AREA (RADAR VECTORS), ORIG ...',
  'RWY 22R, REQUIRES MINIMUM CLIMB OF 406 FT PER NM TO 1000. ALL OTHER DATA REMAINS AS',
  'PUBLISHED 2503052158-2703052158EST',
].join('\n');

// FDC IAP at Boston (from KBOS)
const FDC_BOS_IAP = [
  '!FDC 6/8217 BOS IAP GENERAL EDWARD LAWRENCE LOGAN INTL, BOSTON, MA.',
  'ILS OR LOC RWY 15R, AMDT 2B...',
  'ALTERNATE MINIMUMS NA EXCEPT FOR ACFT EQUIPPED WITH SUITABLE RNAV SYSTEM WITH GPS,',
  'GDM VOR/DME UNMONITORED. 2604041524-2605041524EST',
].join('\n');

// -- En-route FDC samples with a state prefix on the keyword (from KZSE, NMS 2026-10) --

// ROUTE - Airway restriction with "OR.." state prefix (from KZSE)
const FDC_ZSE_ROUTE_OR = [
  '!FDC 6/9312 ZSE OR..ROUTE ZSE.',
  'V182, V27 GAMMA INT, OR MRA 8000.',
  'RBG VOR/DME R-295 UNUSABLE BELOW 8000 AT GAMMA. 2605111405-2805111405EST',
].join('\n');

// ROUTE - Airway MEA change with "WA.." state prefix (from KZSE)
const FDC_ZSE_ROUTE_WA = [
  '!FDC 5/8846 ZSE WA..ROUTE ZSE.',
  'V23 EGRET, WA TO ACORD, WA MEA 4500.',
  '2503032206-2702180901EST',
].join('\n');

// AIRSPACE - Wildfire TFR with "WA.." state prefix (from KZSE)
const FDC_ZSE_AIRSPACE_TFR =
  '!FDC 6/6654 ZSE WA..AIRSPACE 28NM W TWISP, WA..TEMPORARY FLIGHT RESTRICTIONS. PURSUANT TO 14 CFR SECTION 91.137(A)(2) TEMPORARY FLIGHT RESTRICTIONS ARE IN EFFECT TO PROVIDE A SAFE ENVIRONMENT FOR FIRE FIGHTING ACFT OPS. WI AN AREA DEFINED AS 3NM RADIUS OF 482100N1205000W (EAT322062.3) SFC-10000FT CENTRAL WASHINGTON DISPATCH TEL 509-884-3473 OR FREQ 125.300 SISI FIRE IS IN CHARGE OF THE OPERATION. SEATTLE/ZSE/ARTCC TEL 253-351-3698 IS THE FAA CDN FAC. DLY 1600-0200 2610011600-2610150200';
// -- Military NOTAMs with a series-letter number (from KGRF, NMS 2026-10) --

// AERODROME - Instrument approach minimums changed at Gray AAF (from KGRF)
const KGRF_AERODROME_IAP =
  '!KGRF V0397/26 GRF AERODROME INSTRUMENT APPROACH PROCEDURE CHANGED RNAV GPS RWY 15 CIRCLING MINIMUM CAT AB 940-1 639 (700-1) CAT C 940-1 3/4 639 (700-1 3/4) CAT D 940-2 639 (700-2). KTCM ALTIMETER: CIRCLING MINIMUM CAT AB 960-1 659 (700-1) 960-1 3/4 659 (700-1 3/4) 960-2 659 (700-2). 2608232359-2712242359';

// OBST - Crane near Gray AAF, with a CRLF inside the body (from KGRF)
const KGRF_OBST_CRANE =
  '!KGRF M0554/26 GRF OBST CRANE 470428N1223409W (.55NM ESE GRF) 578FT MSL\r\n (250FT AGL) FLAGGED AND LGTD 2608232359-2611132359';
// -- FAA NOTAM Search style samples with 12-digit (YYYYMMDDHHMM) effective periods --
// The search results omit the leading "!"; it is added here because the parser requires it.

// OBST - Tower lighting out of service, definite end (from KTVI)
const SEARCH_TVI_OBST =
  '!MCN 02/142 KTVI OBST TOWER LGT (ASR 1227719) 304050.30N0835820.60W (14.1NM. SSW TVI) 2151.9FT (1997.0FT AGL) U/S 202102061252-202103081252';

// RWY - Runway end lighting out of service, estimated end (from KMVC)
const SEARCH_MVC_RWY = '!ANB 05/310 KMVC RWY 21 RWY END ID LGT U/S 202005151327-202103152111EST';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseFaaNotam', () => {
  describe('error handling', () => {
    it('throws on empty string', () => {
      expect(() => parseFaaNotam('')).toThrow(/Empty NOTAM string/);
    });

    it('throws on string without ! prefix', () => {
      expect(() => parseFaaNotam('ATL 03/296 ATL NAV ILS U/S')).toThrow(/must start with "!"/);
    });

    it('throws on missing NOTAM number', () => {
      expect(() => parseFaaNotam('!ATL ATL NAV ILS U/S 2603181657-2711082111EST')).toThrow(
        /NOTAM number/,
      );
    });

    it('throws on missing keyword', () => {
      expect(() =>
        parseFaaNotam('!ATL 03/296 ATL UNKNOWN_KEYWORD body 2603181657-2711082111EST'),
      ).toThrow(/keyword/);
    });

    it('throws on missing effective period', () => {
      expect(() => parseFaaNotam('!ATL 03/296 ATL NAV ILS RWY 08L IM U/S')).toThrow(
        /effective period/,
      );
    });
  });

  describe('NOTAM D (facility-issued)', () => {
    describe('header parsing', () => {
      it('parses accountability', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.accountability).toBe('ATL');
      });

      it('parses classification as NOTAM_D', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.classification).toBe('NOTAM_D');
      });

      it('parses NOTAM number', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.notamNumber).toBe('03/296');
      });

      it('parses location code', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.locationCode).toBe('ATL');
      });

      it('preserves the raw string', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.raw).toBe(ATL_NAV_ILS);
      });
    });

    describe('keyword parsing', () => {
      it('parses NAV keyword', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.keyword).toBe('NAV');
      });

      it('parses RWY keyword', () => {
        const result = parseFaaNotam(ANC_RWY_CLOSURE);
        expect(result.keyword).toBe('RWY');
      });

      it('parses TWY keyword', () => {
        const result = parseFaaNotam(ANC_TWY_CLOSURE);
        expect(result.keyword).toBe('TWY');
      });

      it('parses OBST keyword', () => {
        const result = parseFaaNotam(ATL_OBST_CRANE);
        expect(result.keyword).toBe('OBST');
      });

      it('parses AIRSPACE keyword', () => {
        const result = parseFaaNotam(ATL_AIRSPACE_UAS);
        expect(result.keyword).toBe('AIRSPACE');
      });

      it('parses APRON keyword', () => {
        const result = parseFaaNotam(BOS_APRON);
        expect(result.keyword).toBe('APRON');
      });

      it('parses AD keyword', () => {
        const result = parseFaaNotam(BOS_AD);
        expect(result.keyword).toBe('AD');
      });

      it('parses SVC keyword', () => {
        const result = parseFaaNotam(BOS_SVC);
        expect(result.keyword).toBe('SVC');
      });
    });

    describe('body text parsing', () => {
      it('extracts NAV body text', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.text).toBe('ILS RWY 08L IM U/S');
      });

      it('extracts RWY closure body text', () => {
        const result = parseFaaNotam(ANC_RWY_CLOSURE);
        expect(result.text).toBe('07R/25L CLSD EXC XNG');
      });

      it('extracts OBST body text with coordinates', () => {
        const result = parseFaaNotam(ATL_OBST_CRANE);
        assert(result.text.includes('(ASN 2025-ASO-10025-NRA)'));
        assert(result.text.includes('FLAGGED AND LGTD'));
      });

      it('extracts multi-line body text', () => {
        const result = parseFaaNotam(ATL_AIRSPACE_UAS);
        assert(result.text.includes('NUMEROUS UAS WI AN AREA'));
        assert(result.text.includes('SFC-300FT AGL'));
      });

      it('extracts TWY closure body text', () => {
        const result = parseFaaNotam(ANC_TWY_CLOSURE);
        assert(result.text.includes('TWY R BTN ALASKA CARGO PORT RAMP'));
      });

      it('extracts APRON body text', () => {
        const result = parseFaaNotam(BOS_APRON);
        assert(result.text.includes('J PAD PRKG RAMP CLSD'));
      });

      it('extracts RWY with PPR body text', () => {
        const result = parseFaaNotam(BOS_RWY_CLSD_TAX);
        assert(result.text.includes('15L/33R CLSD EXC TAX'));
        assert(result.text.includes('PPR 131.1'));
      });
    });

    describe('effective period parsing', () => {
      it('parses standard effective period', () => {
        const result = parseFaaNotam(ANC_RWY_CLOSURE);
        expect(result.effectiveFrom).toEqual({
          year: 26,
          month: 4,
          day: 12,
          hour: 7,
          minute: 30,
        });
        expect(result.effectiveUntil).toEqual({
          year: 26,
          month: 4,
          day: 12,
          hour: 14,
          minute: 30,
        });
        expect(result.isEstimatedEnd).toBe(false);
        expect(result.isPermanent).toBe(false);
      });

      it('parses EST end time', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.effectiveFrom).toEqual({
          year: 26,
          month: 3,
          day: 18,
          hour: 16,
          minute: 57,
        });
        expect(result.effectiveUntil).toEqual({
          year: 27,
          month: 11,
          day: 8,
          hour: 21,
          minute: 11,
        });
        expect(result.isEstimatedEnd).toBe(true);
        expect(result.isPermanent).toBe(false);
      });

      it('parses PERM end time', () => {
        const result = parseFaaNotam(HNL_RWY_PERM);
        expect(result.effectiveFrom).toEqual({
          year: 25,
          month: 5,
          day: 24,
          hour: 19,
          minute: 47,
        });
        expect(result.effectiveUntil).toBe(undefined);
        expect(result.isEstimatedEnd).toBe(false);
        expect(result.isPermanent).toBe(true);
      });
    });

    describe('does not include FDC-only fields', () => {
      it('does not include airportName on NOTAM D', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.airportName).toBe(undefined);
      });

      it('does not include airportLocation on NOTAM D', () => {
        const result = parseFaaNotam(ATL_NAV_ILS);
        expect(result.airportLocation).toBe(undefined);
      });
    });

    describe('various airports', () => {
      it('parses Anchorage PAPI NOTAM', () => {
        const result = parseFaaNotam(ANC_RWY_PAPI);
        expect(result.accountability).toBe('ANC');
        expect(result.keyword).toBe('RWY');
        assert(result.text.includes('25R PAPI U/S'));
        expect(result.isEstimatedEnd).toBe(true);
      });

      it('parses Boston tower light NOTAM', () => {
        const result = parseFaaNotam(BOS_OBST_TOWER);
        expect(result.accountability).toBe('BOS');
        expect(result.keyword).toBe('OBST');
        assert(result.text.includes('TOWER LGT'));
      });

      it('parses Honolulu AD closure', () => {
        const result = parseFaaNotam(HNL_AD_CLSD);
        expect(result.accountability).toBe('HNL');
        expect(result.keyword).toBe('AD');
        assert(result.text.includes('CLSD TO V-22 VTOL'));
      });

      it('parses Honolulu NAV ILS', () => {
        const result = parseFaaNotam(HNL_NAV_ILS);
        expect(result.accountability).toBe('HNL');
        expect(result.keyword).toBe('NAV');
        assert(result.text.includes('ILS RWY 08L OM U/S'));
        expect(result.isEstimatedEnd).toBe(true);
      });

      it('parses Boston AIRSPACE UAS', () => {
        const result = parseFaaNotam(BOS_AIRSPACE_UAS);
        expect(result.keyword).toBe('AIRSPACE');
        assert(result.text.includes('UAS WI AN AREA'));
        assert(result.text.includes('SFC-400FT AGL'));
      });

      it('parses Boston SVC NOTAM', () => {
        const result = parseFaaNotam(BOS_SVC);
        expect(result.keyword).toBe('SVC');
        assert(result.text.includes('MBST/WS DETECTION SYSTEM NOT AVBL'));
      });

      it('parses Anchorage APRON FICON', () => {
        const result = parseFaaNotam(ANC_APRON_FICON);
        expect(result.keyword).toBe('APRON');
        assert(result.text.includes('FICON'));
        assert(result.text.includes('PATCHY ICE'));
      });

      it('parses Anchorage APRON remote spots', () => {
        const result = parseFaaNotam(ANC_APRON_REMOTE);
        expect(result.keyword).toBe('APRON');
        assert(result.text.includes('REMOTE APN SPOT R7'));
      });

      it('parses Boston RWY closure with PPR and phone', () => {
        const result = parseFaaNotam(BOS_RWY_CLSD_PPR);
        expect(result.keyword).toBe('RWY');
        assert(result.text.includes('04L/22R CLSD EXC TAX'));
        assert(result.text.includes('617-561-1919'));
      });

      it('parses Atlanta AIRSPACE controlled burn', () => {
        const result = parseFaaNotam(ATL_AIRSPACE_BURN);
        expect(result.keyword).toBe('AIRSPACE');
        assert(result.text.includes('CONTROLLED BURN'));
        assert(result.text.includes('.5NM RADIUS'));
      });

      it('parses Anchorage TWY sign NOTAM', () => {
        const result = parseFaaNotam(ANC_TWY_SIGN);
        expect(result.keyword).toBe('TWY');
        assert(result.text.includes('LOCATION SIGN'));
        expect(result.isEstimatedEnd).toBe(true);
      });

      it('parses Boston RWY sequenced flashing lights', () => {
        const result = parseFaaNotam(BOS_RWY_FLG_LGT);
        expect(result.keyword).toBe('RWY');
        assert(result.text.includes('22L SEQUENCED FLG LGT U/S'));
      });

      it('parses Boston TWY sign NOTAM', () => {
        const result = parseFaaNotam(BOS_TWY_SIGN);
        expect(result.keyword).toBe('TWY');
        assert(result.text.includes('C APN SIGN LGT U/S'));
      });

      it('parses Boston OBST crane', () => {
        const result = parseFaaNotam(BOS_OBST_CRANE);
        expect(result.keyword).toBe('OBST');
        assert(result.text.includes('(ASN 2025-ANE-1558-NRA)'));
        assert(result.text.includes('FLAGGED AND LGTD'));
      });

      it('parses Boston OBST stack', () => {
        const result = parseFaaNotam(BOS_OBST_STACK);
        expect(result.keyword).toBe('OBST');
        assert(result.text.includes('(ASN UNKNOWN)'));
        assert(result.text.includes('550FT (500FT AGL)'));
      });

      it('parses Anchorage RWY closure with exception', () => {
        const result = parseFaaNotam(ANC_RWY_CLSD_XNG);
        expect(result.keyword).toBe('RWY');
        expect(result.notamNumber).toBe('04/027');
        assert(result.text.includes('07R/25L CLSD EXC XNG'));
      });
    });
  });

  describe('FDC NOTAMs', () => {
    describe('header parsing', () => {
      it('parses FDC accountability', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.accountability).toBe('FDC');
      });

      it('parses classification as FDC', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.classification).toBe('FDC');
      });

      it('parses FDC NOTAM number', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.notamNumber).toBe('5/3374');
      });

      it('parses location code', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.locationCode).toBe('ATL');
      });
    });

    describe('keyword parsing', () => {
      it('parses IAP keyword', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.keyword).toBe('IAP');
      });

      it('parses STAR keyword', () => {
        const result = parseFaaNotam(FDC_BOS_STAR);
        expect(result.keyword).toBe('STAR');
      });

      it('parses ODP keyword', () => {
        const result = parseFaaNotam(FDC_BOS_ODP);
        expect(result.keyword).toBe('ODP');
      });

      it('parses SID keyword', () => {
        const result = parseFaaNotam(FDC_ANC_SID);
        expect(result.keyword).toBe('SID');
      });
    });

    describe('airport info extraction', () => {
      it('extracts airport name for Atlanta', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.airportName).toBe('HARTSFIELD/JACKSON ATLANTA INTL');
      });

      it('extracts airport location for Atlanta', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.airportLocation).toBe('ATLANTA, GA');
      });

      it('extracts airport name for Boston', () => {
        const result = parseFaaNotam(FDC_BOS_STAR);
        expect(result.airportName).toBe('GENERAL EDWARD LAWRENCE LOGAN INTL');
      });

      it('extracts airport location for Boston', () => {
        const result = parseFaaNotam(FDC_BOS_STAR);
        expect(result.airportLocation).toBe('BOSTON, MA');
      });

      it('extracts airport name for Anchorage', () => {
        const result = parseFaaNotam(FDC_ANC_IAP);
        expect(result.airportName).toBe('TED STEVENS ANCHORAGE INTL');
      });

      it('extracts airport location for Anchorage', () => {
        const result = parseFaaNotam(FDC_ANC_IAP);
        expect(result.airportLocation).toBe('ANCHORAGE, AK');
      });

      it('extracts airport name for Honolulu', () => {
        const result = parseFaaNotam(FDC_HNL_STAR);
        expect(result.airportName).toBe('DANIEL K INOUYE INTL AIRPORT');
      });

      it('extracts airport location for Honolulu', () => {
        const result = parseFaaNotam(FDC_HNL_STAR);
        expect(result.airportLocation).toBe('HONOLULU HI');
      });
    });

    describe('body text parsing', () => {
      it('extracts IAP body text without airport info', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        assert(result.text.startsWith('ILS PRM RWY 10'));
        assert(result.text.includes('LOCALIZER NOT SUITABLE FOR ELECTRONIC ROLLOUT GUIDANCE'));
        // Should not contain airport name
        assert(!result.text.includes('HARTSFIELD'));
      });

      it('extracts STAR body text', () => {
        const result = parseFaaNotam(FDC_BOS_STAR);
        assert(result.text.includes('OOSHN FIVE ARRIVAL'));
        assert(result.text.includes('RIFLE ROUTE INCREASE MOCA'));
      });

      it('extracts ODP body text', () => {
        const result = parseFaaNotam(FDC_BOS_ODP);
        assert(result.text.includes('TAKEOFF MINIMUMS'));
        assert(result.text.includes('TREE 3930 FT FROM DER'));
      });

      it('extracts SID body text', () => {
        const result = parseFaaNotam(FDC_ANC_SID);
        assert(result.text.includes('TURNAGAIN EIGHT DEPARTURE'));
        assert(result.text.includes('ENA VOR 348-015'));
      });

      it('extracts Honolulu STAR body text', () => {
        const result = parseFaaNotam(FDC_HNL_STAR);
        assert(result.text.includes('SHLAE ONE ARRIVAL NOT AUTHORIZED'));
      });
    });

    describe('effective period parsing', () => {
      it('parses EST end time on FDC NOTAM', () => {
        const result = parseFaaNotam(FDC_ATL_IAP);
        expect(result.effectiveFrom).toEqual({
          year: 25,
          month: 12,
          day: 2,
          hour: 18,
          minute: 12,
        });
        expect(result.effectiveUntil).toEqual({
          year: 27,
          month: 12,
          day: 2,
          hour: 18,
          minute: 9,
        });
        expect(result.isEstimatedEnd).toBe(true);
      });

      it('parses PERM end time on FDC NOTAM', () => {
        const result = parseFaaNotam(FDC_BOS_STAR);
        expect(result.effectiveFrom).toEqual({
          year: 25,
          month: 10,
          day: 30,
          hour: 15,
          minute: 0,
        });
        expect(result.effectiveUntil).toBe(undefined);
        expect(result.isPermanent).toBe(true);
      });

      it('parses standard end time on FDC NOTAM', () => {
        const result = parseFaaNotam(FDC_HNL_STAR);
        expect(result.effectiveFrom).toEqual({
          year: 25,
          month: 12,
          day: 31,
          hour: 22,
          minute: 51,
        });
        expect(result.effectiveUntil).toEqual({
          year: 26,
          month: 12,
          day: 31,
          hour: 23,
          minute: 59,
        });
        expect(result.isEstimatedEnd).toBe(false);
        expect(result.isPermanent).toBe(false);
      });
    });

    describe('various FDC NOTAMs', () => {
      it('parses FDC RNAV IAP at Atlanta', () => {
        const result = parseFaaNotam(FDC_ATL_IAP_RNAV);
        expect(result.keyword).toBe('IAP');
        expect(result.airportName).toBe('HARTSFIELD/JACKSON ATLANTA INTL');
        assert(result.text.includes('RNAV (RNP) Z RWY 28'));
        assert(result.text.includes('RNP 0.11 DA 1315/HAT 317'));
      });

      it('parses FDC ODP/DVA at Boston', () => {
        const result = parseFaaNotam(FDC_BOS_DVA);
        expect(result.keyword).toBe('ODP');
        assert(result.text.includes('DIVERSE VECTOR AREA'));
      });

      it('parses FDC IAP at Boston', () => {
        const result = parseFaaNotam(FDC_BOS_IAP);
        expect(result.keyword).toBe('IAP');
        expect(result.airportName).toBe('GENERAL EDWARD LAWRENCE LOGAN INTL');
        assert(result.text.includes('ILS OR LOC RWY 15R'));
      });

      it('parses FDC IAP at Honolulu with crane info', () => {
        const result = parseFaaNotam(FDC_HNL_IAP);
        expect(result.keyword).toBe('IAP');
        assert(result.text.includes('TEMPORARY CRANE 235 MSL'));
        assert(result.text.includes('2024-AWP-5290-NRA'));
      });

      it('parses FDC SID at Anchorage', () => {
        const result = parseFaaNotam(FDC_ANC_SID);
        expect(result.keyword).toBe('SID');
        expect(result.airportName).toBe('TED STEVENS ANCHORAGE INTL');
        expect(result.airportLocation).toBe('ANCHORAGE, AK');
      });
    });

    describe('state-prefixed keyword (en-route FDCs)', () => {
      it('parses ROUTE after an "OR.." state prefix', () => {
        const result = parseFaaNotam(FDC_ZSE_ROUTE_OR);
        expect(result.classification).toBe('FDC');
        expect(result.notamNumber).toBe('6/9312');
        expect(result.locationCode).toBe('ZSE');
        expect(result.keyword).toBe('ROUTE');
        expect(result.state).toBe('OR');
        expect(result.airportName).toBeUndefined();
        expect(result.airportLocation).toBeUndefined();
        assert(result.text.startsWith('ZSE.'));
        assert(result.text.includes('V182, V27 GAMMA INT, OR MRA 8000.'));
        expect(result.isEstimatedEnd).toBe(true);
        expect(result.effectiveFrom).toEqual({ year: 26, month: 5, day: 11, hour: 14, minute: 5 });
        expect(result.effectiveUntil).toEqual({ year: 28, month: 5, day: 11, hour: 14, minute: 5 });
      });

      it('parses ROUTE after a "WA.." state prefix', () => {
        const result = parseFaaNotam(FDC_ZSE_ROUTE_WA);
        expect(result.keyword).toBe('ROUTE');
        expect(result.state).toBe('WA');
        expect(result.text).toBe('ZSE. V23 EGRET, WA TO ACORD, WA MEA 4500');
      });

      it('parses AIRSPACE after a "WA.." state prefix', () => {
        const result = parseFaaNotam(FDC_ZSE_AIRSPACE_TFR);
        expect(result.keyword).toBe('AIRSPACE');
        expect(result.state).toBe('WA');
        expect(result.airportName).toBeUndefined();
        assert(result.text.startsWith('28NM W TWISP, WA..TEMPORARY FLIGHT RESTRICTIONS.'));
        assert(result.text.endsWith('DLY 1600-0200'));
        expect(result.effectiveUntil).toEqual({ year: 26, month: 10, day: 15, hour: 2, minute: 0 });
        expect(result.isEstimatedEnd).toBe(false);
      });

      it('omits state when the keyword follows the location directly', () => {
        expect(parseFaaNotam(FDC_ATL_IAP)).not.toHaveProperty('state');
        expect(parseFaaNotam(ATL_NAV_ILS)).not.toHaveProperty('state');
      });

      it('does not treat a state prefix without a keyword as valid', () => {
        expect(() =>
          parseFaaNotam('!FDC 6/9312 ZSE OR..BOGUS ZSE. V182 MRA 8000. 2605111405-2805111405EST'),
        ).toThrow(/keyword/);
      });
    });
  });

  describe('series-letter NOTAM numbers (military)', () => {
    it('parses a "V0397/26" number and the AERODROME long-form keyword', () => {
      const result = parseFaaNotam(KGRF_AERODROME_IAP);
      expect(result.accountability).toBe('KGRF');
      expect(result.classification).toBe('NOTAM_D');
      expect(result.notamNumber).toBe('V0397/26');
      expect(result.locationCode).toBe('GRF');
      expect(result.keyword).toBe('AD');
      assert(result.text.startsWith('INSTRUMENT APPROACH PROCEDURE CHANGED RNAV GPS RWY 15'));
      expect(result.effectiveFrom).toEqual({ year: 26, month: 8, day: 23, hour: 23, minute: 59 });
      expect(result.effectiveUntil).toEqual({ year: 27, month: 12, day: 24, hour: 23, minute: 59 });
      expect(result.isEstimatedEnd).toBe(false);
      expect(result.isPermanent).toBe(false);
    });

    it('parses an "M0554/26" number with an ordinary keyword and CRLF in the body', () => {
      const result = parseFaaNotam(KGRF_OBST_CRANE);
      expect(result.accountability).toBe('KGRF');
      expect(result.notamNumber).toBe('M0554/26');
      expect(result.keyword).toBe('OBST');
      expect(result.text).toBe(
        'CRANE 470428N1223409W (.55NM ESE GRF) 578FT MSL (250FT AGL) FLAGGED AND LGTD',
      );
    });

    it('still reads the month/sequence number form unchanged', () => {
      expect(parseFaaNotam(ATL_NAV_ILS).notamNumber).toBe('03/296');
    });

    it('still throws on a malformed series-letter number', () => {
      expect(() =>
        parseFaaNotam('!KGRF V03/26 GRF OBST CRANE 578FT MSL 2608232359-2611132359'),
      ).toThrow(/NOTAM number/);
      expect(() =>
        parseFaaNotam('!KGRF V0395-26 GRF OBST CRANE 578FT MSL 2608232359-2611132359'),
      ).toThrow(/NOTAM number/);
    });
  });

  describe('12-digit effective periods (FAA NOTAM Search)', () => {
    it('parses YYYYMMDDHHMM-YYYYMMDDHHMM', () => {
      const result = parseFaaNotam(SEARCH_TVI_OBST);
      expect(result.accountability).toBe('MCN');
      expect(result.notamNumber).toBe('02/142');
      expect(result.locationCode).toBe('KTVI');
      expect(result.keyword).toBe('OBST');
      expect(result.text).toBe(
        'TOWER LGT (ASR 1227719) 304050.30N0835820.60W (14.1NM. SSW TVI) 2151.9FT (1997.0FT AGL) U/S',
      );
      expect(result.effectiveFrom).toEqual({ year: 21, month: 2, day: 6, hour: 12, minute: 52 });
      expect(result.effectiveUntil).toEqual({ year: 21, month: 3, day: 8, hour: 12, minute: 52 });
      expect(result.isEstimatedEnd).toBe(false);
      expect(result.isPermanent).toBe(false);
    });

    it('parses the EST suffix after a 12-digit end', () => {
      const result = parseFaaNotam(SEARCH_MVC_RWY);
      expect(result.keyword).toBe('RWY');
      expect(result.text).toBe('21 RWY END ID LGT U/S');
      expect(result.effectiveFrom).toEqual({ year: 20, month: 5, day: 15, hour: 13, minute: 27 });
      expect(result.effectiveUntil).toEqual({ year: 21, month: 3, day: 15, hour: 21, minute: 11 });
      expect(result.isEstimatedEnd).toBe(true);
    });

    it('parses a 12-digit start with PERM', () => {
      const result = parseFaaNotam('!RNT 10/025 RNT TWY A CLSD 202610011200-PERM');
      expect(result.effectiveFrom).toEqual({ year: 26, month: 10, day: 1, hour: 12, minute: 0 });
      expect(result.effectiveUntil).toBeUndefined();
      expect(result.isPermanent).toBe(true);
    });

    it('produces the same result as the 10-digit form of the same period', () => {
      const long = parseFaaNotam('!RNT 10/025 RNT TWY A CLSD 202610011200-202610201200');
      const short = parseFaaNotam('!RNT 10/025 RNT TWY A CLSD 2610011200-2610201200');
      expect({ ...long, raw: '' }).toEqual({ ...short, raw: '' });
    });

    it('still rejects timestamps that are neither 10 nor 12 digits', () => {
      expect(() => parseFaaNotam('!RNT 10/025 RNT TWY A CLSD 20261001120-20261020120')).toThrow(
        /effective period/,
      );
      expect(() => parseFaaNotam('!RNT 10/025 RNT TWY A CLSD 2026100112000-2026102012000')).toThrow(
        /effective period/,
      );
    });
  });

  describe('lowercase input', () => {
    it('parses a lowercase NOTAM D, normalizing the structural fields to uppercase', () => {
      const result = parseFaaNotam(ATL_NAV_ILS.toLowerCase());
      expect(result).toEqual({
        ...parseFaaNotam(ATL_NAV_ILS),
        raw: ATL_NAV_ILS.toLowerCase(),
        text: 'ils rwy 08l im u/s',
      });
    });

    it('parses a lowercase FDC, leaving the body as written', () => {
      const result = parseFaaNotam(FDC_ANC_SID.toLowerCase());
      expect(result.accountability).toBe('FDC');
      expect(result.classification).toBe('FDC');
      expect(result.notamNumber).toBe('5/2149');
      expect(result.locationCode).toBe('ANC');
      expect(result.keyword).toBe('SID');
      assert(result.text.startsWith('ted stevens anchorage intl, anchorage, ak.'));
      expect(result.isEstimatedEnd).toBe(true);
    });

    it('parses lowercase perm', () => {
      const result = parseFaaNotam('!rnt 10/025 rnt twy a clsd 2610011200-perm');
      expect(result.keyword).toBe('TWY');
      expect(result.isPermanent).toBe(true);
    });

    it('still throws on an unknown keyword', () => {
      expect(() => parseFaaNotam('!atl 03/296 atl bogus ils u/s 2603181657-2711082111est')).toThrow(
        /keyword/,
      );
    });
  });

  describe('combined forms', () => {
    it('parses a lowercase series-letter military NOTAM', () => {
      const result = parseFaaNotam(KGRF_OBST_CRANE.toLowerCase());
      expect(result.accountability).toBe('KGRF');
      expect(result.notamNumber).toBe('M0554/26');
      expect(result.locationCode).toBe('GRF');
      expect(result.keyword).toBe('OBST');
    });

    it('parses a lowercase state-prefixed FDC', () => {
      const result = parseFaaNotam(FDC_ZSE_ROUTE_WA.toLowerCase());
      expect(result.keyword).toBe('ROUTE');
      expect(result.state).toBe('WA');
    });

    it('parses a state-prefixed FDC with 12-digit dates', () => {
      const result = parseFaaNotam(
        '!FDC 5/8846 ZSE WA..ROUTE ZSE. V23 EGRET, WA TO ACORD, WA MEA 4500. 202503032206-202702180901EST',
      );
      expect(result.state).toBe('WA');
      expect(result.effectiveFrom).toEqual({ year: 25, month: 3, day: 3, hour: 22, minute: 6 });
      expect(result.isEstimatedEnd).toBe(true);
    });
  });

  describe('untested keywords (constructed data)', () => {
    it('parses COM keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_COM);
      expect(result.keyword).toBe('COM');
      expect(result.accountability).toBe('DCA');
      expect(result.locationCode).toBe('DCA');
      assert(result.text.includes('CTAF 122.725 CHANGED TO 123.075'));
    });

    it('parses VFP keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_VFP);
      expect(result.keyword).toBe('VFP');
      assert(result.text.includes('RIVER VISUAL RWY 13 NA'));
      expect(result.isEstimatedEnd).toBe(true);
    });

    it('parses DVA keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_DVA);
      expect(result.keyword).toBe('DVA');
      assert(result.text.includes('DIVERSE VECTOR AREA NOT AUTHORIZED'));
    });

    it('parses ROUTE keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_ROUTE);
      expect(result.keyword).toBe('ROUTE');
      expect(result.locationCode).toBe('ZNY');
      assert(result.text.includes('V16 BTN ALB AND GDC NA'));
      expect(result.isEstimatedEnd).toBe(true);
    });

    it('parses CHART keyword on FDC NOTAM', () => {
      const result = parseFaaNotam(CONSTRUCTED_CHART);
      expect(result.keyword).toBe('CHART');
      expect(result.classification).toBe('FDC');
      expect(result.isPermanent).toBe(true);
    });

    it('parses DATA keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_DATA);
      expect(result.keyword).toBe('DATA');
      assert(result.text.includes('ARPT ELEVATION CHANGED TO 14FT'));
      expect(result.isPermanent).toBe(true);
    });

    it('parses SPECIAL keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_SPECIAL);
      expect(result.keyword).toBe('SPECIAL');
      assert(result.text.includes('SEE FDC NOTAM 6/1234'));
    });

    it('parses SECURITY keyword', () => {
      const result = parseFaaNotam(CONSTRUCTED_SECURITY);
      expect(result.keyword).toBe('SECURITY');
      assert(result.text.includes('FRZ IN EFFECT'));
      assert(result.text.includes('P-56'));
    });
  });

  describe('accountability and location variations (constructed data)', () => {
    it('parses 4-character CARF accountability', () => {
      const result = parseFaaNotam(CONSTRUCTED_CARF);
      expect(result.accountability).toBe('CARF');
      expect(result.classification).toBe('NOTAM_D');
      expect(result.locationCode).toBe('ZAB');
      expect(result.keyword).toBe('AIRSPACE');
      assert(result.text.includes('STNR ALT RESERVATION'));
    });

    it('parses 4-character SUAE accountability', () => {
      const result = parseFaaNotam(CONSTRUCTED_SUAE);
      expect(result.accountability).toBe('SUAE');
      expect(result.locationCode).toBe('ZNY');
      expect(result.keyword).toBe('AIRSPACE');
      assert(result.text.includes('R5206 ACT'));
    });

    it('parses GPS accountability', () => {
      const result = parseFaaNotam(CONSTRUCTED_GPS);
      expect(result.accountability).toBe('GPS');
      expect(result.classification).toBe('NOTAM_D');
      expect(result.locationCode).toBe('ZAB');
      expect(result.keyword).toBe('NAV');
      assert(result.text.includes('GPS (NAFC GPS 15-01 E1)'));
    });

    it('parses pointer NOTAM where accountability equals location', () => {
      const result = parseFaaNotam(CONSTRUCTED_POINTER);
      expect(result.accountability).toBe('VUJ');
      expect(result.locationCode).toBe('VUJ');
      expect(result.keyword).toBe('SVC');
      assert(result.text.includes('SEE ZTL 05/754 STANLY APP CLSD'));
    });

    it('parses digit-first alphanumeric location code', () => {
      const result = parseFaaNotam(CONSTRUCTED_ALPHANUM_LOC);
      expect(result.accountability).toBe('8I1');
      expect(result.locationCode).toBe('8I1');
      expect(result.keyword).toBe('AD');
      assert(result.text.includes('CLSD DUE TO CONSTRUCTION'));
    });
  });

  describe('edge cases', () => {
    it('handles multi-line NOTAM D', () => {
      const result = parseFaaNotam(HNL_RWY_PERM);
      expect(result.keyword).toBe('RWY');
      assert(result.text.includes('04R/22L CHANGED TO 9002FT X 150FT'));
      assert(result.text.includes('LDA 8937FT'));
    });

    it('handles multi-line FDC NOTAM', () => {
      const result = parseFaaNotam(FDC_BOS_ODP);
      expect(result.keyword).toBe('ODP');
      assert(result.text.includes('172 FT MSL'));
    });

    it('handles NOTAM with double spaces', () => {
      const result = parseFaaNotam(ANC_APRON_FICON);
      expect(result.keyword).toBe('APRON');
      assert(result.text.includes('FICON'));
    });

    it('handles \\r\\n line endings', () => {
      const result = parseFaaNotam(FDC_CRLF);
      expect(result.classification).toBe('FDC');
      expect(result.keyword).toBe('IAP');
      expect(result.airportName).toBe('HARTSFIELD/JACKSON ATLANTA INTL');
      assert(result.text.includes('ILS RWY 27L AMDT 20'));
      expect(result.isEstimatedEnd).toBe(true);
    });

    it('handles leading and trailing whitespace', () => {
      const result = parseFaaNotam(NOTAM_WITH_WHITESPACE);
      expect(result.accountability).toBe('ATL');
      expect(result.keyword).toBe('NAV');
      expect(result.text).toBe('ILS RWY 08L IM U/S');
      expect(result.raw).toBe(NOTAM_WITH_WHITESPACE.trim());
    });

    it('handles body text containing 10-digit numbers', () => {
      const result = parseFaaNotam(CONSTRUCTED_BODY_WITH_DIGITS);
      expect(result.keyword).toBe('OBST');
      assert(result.text.includes('(ASR 1044148)'));
      assert(result.text.includes('333557.80N0842853.79W'));
      // Effective period should be correctly extracted from the end
      expect(result.effectiveFrom).toEqual({ year: 26, month: 3, day: 12, hour: 14, minute: 6 });
      expect(result.effectiveUntil).toEqual({ year: 26, month: 4, day: 26, hour: 14, minute: 6 });
    });

    it('handles FDC NOTAM with no airport info match', () => {
      const result = parseFaaNotam(FDC_NO_AIRPORT_MATCH);
      expect(result.classification).toBe('FDC');
      expect(result.keyword).toBe('STAR');
      // Airport info parsing should fail gracefully - body contains everything
      expect(result.airportName).toBe(undefined);
      expect(result.airportLocation).toBe(undefined);
      assert(result.text.includes('DANIEL K'));
      assert(result.text.includes('KLANI FOUR ARRIVAL NOT AUTHORIZED'));
    });
  });
});
