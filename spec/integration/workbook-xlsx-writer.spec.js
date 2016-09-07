'use strict';

var fs = require('fs');
var expect = require('chai').expect;
var bluebird = require('bluebird');
var _ = require('underscore');
var Excel = require('../../excel');
var testUtils = require('./../utils/index');
var utils = require('../../lib/utils/utils');

var TEST_FILE_NAME = './spec/out/wb.test.xlsx';

describe('WorkbookWriter', function() {

  it('creates sheets with correct names', function() {
    var wb = new Excel.stream.xlsx.WorkbookWriter();
    var ws1 = wb.addWorksheet('Hello, World!');
    expect(ws1.name).to.equal('Hello, World!');

    var ws2 = wb.addWorksheet();
    expect(ws2.name).to.match(/sheet\d+/);
  });

  describe('Serialise', function() {
    it('xlsx file', function() {
      var options = {
        filename: TEST_FILE_NAME,
        useStyles: true
      };
      var wb = testUtils.createTestBook(new Excel.stream.xlsx.WorkbookWriter(options), 'xlsx');

      return wb.commit()
        .then(function() {
          var wb2 = new Excel.Workbook();
          return wb2.xlsx.readFile(TEST_FILE_NAME);
        })
        .then(function(wb2) {
          testUtils.checkTestBook(wb2, 'xlsx');
        });
    });

    it('Without styles', function() {
      var options = {
        filename: TEST_FILE_NAME,
        useStyles: false
      };
      var wb = testUtils.createTestBook(new Excel.stream.xlsx.WorkbookWriter(options), 'xlsx');

      return wb.commit()
        .then(function() {
          var wb2 = new Excel.Workbook();
          return wb2.xlsx.readFile(TEST_FILE_NAME);
        })
        .then(function(wb2) {
          testUtils.checkTestBook(wb2, 'xlsx', undefined, {checkStyles: false});
        });
    });

    it('serializes row styles and columns properly', function() {
      var options = {
        filename: TEST_FILE_NAME,
        useStyles: true
      };
      var wb = new Excel.stream.xlsx.WorkbookWriter(options);
      var ws = wb.addWorksheet('blort');

      var colStyle = {
        font: testUtils.styles.fonts.comicSansUdB16,
        alignment: testUtils.styles.namedAlignments.middleCentre
      };
      ws.columns = [
        { header: 'A1', width: 10 },
        { header: 'B1', width: 20, style: colStyle },
        { header: 'C1', width: 30 }
      ];

      ws.getRow(2).font = testUtils.styles.fonts.broadwayRedOutline20;

      ws.getCell('A2').value = 'A2';
      ws.getCell('B2').value = 'B2';
      ws.getCell('C2').value = 'C2';
      ws.getCell('A3').value = 'A3';
      ws.getCell('B3').value = 'B3';
      ws.getCell('C3').value = 'C3';

      return wb.commit()
        .then(function() {
          var wb2 = new Excel.Workbook();
          return wb2.xlsx.readFile(TEST_FILE_NAME);
        })
        .then(function(wb2) {
          var ws2 = wb2.getWorksheet('blort');
          _.each(['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'], function(address) {
            expect(ws2.getCell(address).value).to.equal(address);
          });
          expect(ws2.getCell('B1').font).to.deep.equal(testUtils.styles.fonts.comicSansUdB16);
          expect(ws2.getCell('B1').alignment).to.deep.equal(testUtils.styles.namedAlignments.middleCentre);
          expect(ws2.getCell('A2').font).to.deep.equal(testUtils.styles.fonts.broadwayRedOutline20);
          expect(ws2.getCell('B2').font).to.deep.equal(testUtils.styles.fonts.broadwayRedOutline20);
          expect(ws2.getCell('C2').font).to.deep.equal(testUtils.styles.fonts.broadwayRedOutline20);
          expect(ws2.getCell('B3').font).to.deep.equal(testUtils.styles.fonts.comicSansUdB16);
          expect(ws2.getCell('B3').alignment).to.deep.equal(testUtils.styles.namedAlignments.middleCentre);

          expect(ws2.getColumn(2).font).to.deep.equal(testUtils.styles.fonts.comicSansUdB16);
          expect(ws2.getColumn(2).alignment).to.deep.equal(testUtils.styles.namedAlignments.middleCentre);

          expect(ws2.getRow(2).font).to.deep.equal(testUtils.styles.fonts.broadwayRedOutline20);
        });
    });

    it('A lot of sheets', function() {
      this.timeout(5000);

      var i;
      var wb = new Excel.stream.xlsx.WorkbookWriter({filename: TEST_FILE_NAME});
      var numSheets = 90;
      // add numSheets sheets
      for (i = 1; i <= numSheets; i++) {
        var ws = wb.addWorksheet('sheet' + i);
        ws.getCell('A1').value = i;
      }
      return wb.commit()
        .then(function() {
          var wb2 = new Excel.Workbook();
          return wb2.xlsx.readFile(TEST_FILE_NAME);
        })
        .then(function(wb2) {
          for (i = 1; i <= numSheets; i++) {
            var ws2 = wb2.getWorksheet('sheet' + i);
            expect(ws2).to.be.ok;
            expect(ws2.getCell('A1').value).to.equal(i);
          }
        });
    });

    it('addRow', function() {
      var options = {
        stream: fs.createWriteStream(TEST_FILE_NAME, {flags: 'w'}),
        useStyles: true,
        useSharedStrings: true
      };
      var workbook = new Excel.stream.xlsx.WorkbookWriter(options);
      var worksheet = workbook.addWorksheet('test');
      var newRow = worksheet.addRow(['hello']);
      newRow.commit();
      worksheet.commit();
      return workbook.commit();
    });

    it('defined names', function() {
      var wb = new Excel.stream.xlsx.WorkbookWriter({filename: TEST_FILE_NAME});
      var ws = wb.addWorksheet('blort');
      ws.getCell('A1').value = 5;
      ws.getCell('A1').name = 'five';

      ws.getCell('A3').value = 'drei';
      ws.getCell('A3').name = 'threes';
      ws.getCell('B3').value = 'trois';
      ws.getCell('B3').name = 'threes';
      ws.getCell('B3').value = 'san';
      ws.getCell('B3').name = 'threes';

      ws.getCell('E1').value = 'grün';
      ws.getCell('E1').name = 'greens';
      ws.getCell('E2').value = 'vert';
      ws.getCell('E2').name = 'greens';
      ws.getCell('E3').value = 'verde';
      ws.getCell('E3').name = 'greens';

      return wb.commit()
        .then(function() {
          var wb2 = new Excel.Workbook();
          return wb2.xlsx.readFile(TEST_FILE_NAME);
        })
        .then(function(wb2) {
          var ws2 = wb2.getWorksheet('blort');
          expect(ws2.getCell('A1').name).to.equal('five');

          expect(ws2.getCell('A3').name).to.equal('threes');
          expect(ws2.getCell('B3').name).to.equal('threes');
          expect(ws2.getCell('B3').name).to.equal('threes');

          expect(ws2.getCell('E1').name).to.equal('greens');
          expect(ws2.getCell('E2').name).to.equal('greens');
          expect(ws2.getCell('E3').name).to.equal('greens');
        });
    });

    it('serializes and deserializes dataValidations', function() {
      var options = {filename: TEST_FILE_NAME};
      var wb = testUtils.createTestBook(new Excel.stream.xlsx.WorkbookWriter(options),'xlsx', ['dataValidations']);

      return wb.commit()
        .then(function() {
          var wb2 = new Excel.Workbook();
          return wb2.xlsx.readFile(TEST_FILE_NAME);
        })
        .then(function(wb2) {
          testUtils.checkTestBook(wb2, 'xlsx', ['dataValidations']);
        });
    });
  });
});
