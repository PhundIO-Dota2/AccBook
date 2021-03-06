function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('AccBook')
    .addItem('Calculate price cells', 'calcPriceCells')
    .addItem('Calculate netvalue cells', 'calcNetvalueCells')
    .addItem('Calculate change cells', 'calcChangeCells')
    .addItem('Calculate total and total change cells', 'calcTotalAndTotalChangeCells')
    .addToUi();
}
function calcPriceCells() {
  Logger.log('In calcPriceCells');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = SpreadsheetApp.getActiveRange();
  var snapshot = new Snapshot({cell: range.getCell(1, 1)});
  Logger.log('Active range: ' + range.getA1Notation());
  var cols = range.getNumColumns();
  for (var i=1; i<=cols; i++) {
    var priceCell = range.getCell(1, i);
    var assetClassCell = sheet.getRange(Snapshot.assetClassRow, priceCell.getColumn());
    var assetClass = assetClassCell.getValue();
    Logger.log('assetClass: ' + assetClass);
    priceCell.setValue(Snapshot.getPrice(assetClass));
  }
}
function calcNetvalueCells() {  
  Logger.log('In calcNetvalueCells');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = SpreadsheetApp.getActiveRange();
  var snapshot = new Snapshot({cell: range.getCell(1, 1)});
  Logger.log('Active range: ' + range.getA1Notation());
  var cols = range.getNumColumns();
  for (var i=1; i<=cols; i++) {
    var netvalueCell = range.getCell(1, i);
    var unitCell = sheet.getRange(snapshot.unitRow, netvalueCell.getColumn());
    var priceCell = sheet.getRange(snapshot.priceRow, netvalueCell.getColumn());
    netvalueCell.setValue(parseFloat(unitCell.getValue()) * parseFloat(priceCell.getValue()));
  }
}
function calcChangeCells() {
  
}
function calcTotalAndTotalChangeCells() {
  Logger.log('In calcTotalAndTotalChangeCells');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = SpreadsheetApp.getActiveRange();
  var snapshot = new Snapshot({cell: range.getCell(1, 1)});
  Logger.log('Active range: ' + range.getA1Notation());
  var col = Snapshot.firstVaultCol, curNetvalue, total = 0;
  while ((curNetvalue = sheet.getRange(snapshot.netvalueRow, col).getValue()) !== '') {
    total += parseFloat(curNetvalue);
    col++;
  }
  range.getCell(2, 1).setValue('Total\n'+total);
  if (snapshot.snapshotSerial === 1) {
    range.getCell(1, 1).setValue('Total Change\n0');
  } else {
    var prevSnapshot = new Snapshot({serial: snapshot.snapshotSerial - 1});
    var prevTotal = sheet.getRange(prevSnapshot.totalCoord.row, prevSnapshot.totalCoord.col).getValue().substring(6);
    var changeAmount = total - parseFloat(prevTotal);
    range.getCell(1, 1).setValue('Total Change\n' + changeAmount);
  }
}
function Snapshot(opt) {
  if (opt.cell) {
    var row = opt.cell.getRow();
    this.snapshotSerial = Math.ceil((row - 2) / 4);
  } else if (opt.serial !== undefined) {
    this.snapshotSerial = opt.serial;
  } else {
    throw new Exception('Wrong param to Snapshot() constructor: ' + opt);
  }
  this.baseRow = (this.snapshotSerial - 1) * 4 + 3;
  this.baseCol = 1;
  this.unitRow = this.baseRow;
  this.changeRow = this.baseRow + 1;
  this.priceRow = this.baseRow + 2;
  this.netvalueRow = this.baseRow + 3;
  this.totalChangeCoord = {row: this.baseRow + 2, col: this.baseCol};
  this.totalCoord = {row: this.baseRow + 3, col: this.baseCol};
}
Snapshot.vaultRow = 1;
Snapshot.assetClassRow = 2;
Snapshot.firstVaultCol = 3;
Snapshot.getPrice = function(assetClass) {
  if (!Snapshot.fiatRates) {
    var res = UrlFetchApp.fetch('http://api.fixer.io/latest?base=USD');
    var rates = JSON.parse(res.getContentText()).rates;
    Logger.log('Fiat rates: ' + JSON.stringify(rates));
    for (var fiat in rates) {
      rates[fiat] = 1 / rates[fiat];
    }
    Snapshot.fiatRates = rates;
    Snapshot.fiatRates.USD = 1;
  }
  if (Snapshot.fiatRates[assetClass]) {
    return Snapshot.fiatRates[assetClass];
  }
  if (!Snapshot.cryptoRates) {
    Snapshot.cryptoRates = {};
    var res, json, cryptos = ['BTC', 'ETH', 'LTC', 'XRP', 'REP', 'BTS'];
    for (var i=0; i<cryptos.length; i++) {
      res = UrlFetchApp.fetch('https://api.cryptonator.com/api/ticker/'+ cryptos[i].toLowerCase() +'-usd');
      json = JSON.parse(res.getContentText());
      Snapshot.cryptoRates[cryptos[i]] = json.ticker.price;
    }
    Snapshot.cryptoRates['BTM'] = 0.105;
  }
  if (Snapshot.cryptoRates[assetClass]) {
    return Snapshot.cryptoRates[assetClass];
  }
  return 0;
};
