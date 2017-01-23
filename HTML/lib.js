// Library functions

var days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
var accumulated_months_days = [];
var colors=[["#ee8735","#ec7c19","#ff8e1c","#f6a94a","#fcd18c"],  // Amazon
           ["#fbee00","#f5e100","#fbee00","#fff57f","#fbf5a0"],  // Softlayer
           ["#3e9a36","#27bc49","#3bd771","#7fd993","#a7d398"],  // Nimbix
           ["#00b1e7","#11ade5","#51c1e4","#88dcef","#86e4fa"],  // Cirrascale
           ["#f0308b","#ec5896","#ff5a9f","#fe7bb0","#fe9ec1"],  // Sakura
           ["#964fb7","#8937a8","#9b49ba","#b970c4","#cb8edf"],  // LeaderTelecom
           ["#503a1b"]];  // other

var base_currency="USD";

var setRates = function(data) {
    fx.base = base_currency;
    fx.settings = { to: base_currency };
    fx.rates = data.rates

    //alert("£1 = $" + rate.toFixed(4));
    fx.rates[base_currency] = 1;

    //console.log(fx.rates);
    //console.log(fx.base);
    //loadData("cost-performance.csv");
    loadData("http://comp.photo777.org/cloudproviders/cost-performance.csv");
}


// Refer to
// http://openexchangerates.github.io/money.js/
function getRates() {
    $.getJSON("http://api.fixer.io/latest?base="+base_currency, setRates);
}


function loadData(filename) {
    Papa.parse(filename, {
        download: true,
        complete: processStaticData
    });
}


function processStaticData(results) {
    console.log("Rows: "+results.data.length);
    //var max_rows = 10000;

    var rows = results.data.length
    var provider = "";
    var provider_link = "";
    for (var i=start_row; i<rows; i++) {
        row = results.data[i];
        if (provider !=  row[0] && row[0] !="") {
            provider = row[0];
            provider_link = row[1];
        }
        var offer = {
            provider: provider,
            provider_link: provider_link,
            name: row[2],
            name_link: row[3],
            shortname: row[4],
            hourly_native: row[5],
            weekly_native: row[6],
            monthly_native: row[7],
            yearly_native: row[8],
            setup_native: row[9],
            hourly:    convert2BaseCurrency(row[5],row[10]),
            weekly:    convert2BaseCurrency(row[6],row[10]),
            monthly:   convert2BaseCurrency(row[7],row[10]),
            yearly:    convert2BaseCurrency(row[8],row[10]),
            setup:     convert2BaseCurrency(row[9],row[10]),
            currency:  row[10],
            cpu_p:     row[11],
            gpu_p:     row[12],
            gpu_model: row[13],
            gpus:      row[14],
            cpu_model: row[15],
            cpus:      row[16],
            memory:    row[17],
            hdd1:      row[18],
            hdd1_vol:  row[19],
            hdd2:      row[20],
            hdd2_vol:  row[21],
            net:       row[22],
            notes:     row[23]
        }
        offers_all.push(offer);
    }
    continue_proc(filterAll, "");
    msg.innerHTML = "";
    printRates();
}


function getOfferInfo(j) {
    var memory = offers[j].memory;
    if (memory == null || memory == "") {
        memory = ""
    } else {
        memory = " | RAM: " + memory + " GB"
    }
    return offers[j].provider + " "+ offers[j].name + " | CPU: " + offers[j].cpu_model + " x" + offers[j].cpus + " |  GPU: "+ offers[j].gpu_model + " x"+ offers[j].gpus + memory;
}


// "Filters" offers: save filtered list in "offers" global variable.
function filterAll(arg) {
    offers = [];
    for (j=0; j < offers_all.length; j++) {
        offers.push(offers_all[j]);
    }
}

// Filters offers: save filtered list in "offers" global variable.
// Filter out offers with GPUs in range given by group argument with format string "min-miax".
function filterByGPU(group) {
    offers = [];
    min = 0;
    max = 0;
    splits = group.split("-");
    min = parseInt(splits[0]);
    if (splits.length >= 2  && splits[1] != "") {
        max = parseInt(splits[1]);
    } else {
        max = 1000000;
    }
    console.log("Filtering by "+min+" - " + max+ ", "+splits.length+":"+splits);
    for (j=0; j < offers_all.length; j++) {
        if (offers_all[j].gpus >= min && offers_all[j].gpus <= max) {
            offers.push(offers_all[j]);
        }
    }
}

// Filter by provider
function filterProvider(prov) {
    offers = [];
    //console.log("Filter " + prov.toLowerCase());
    for (j=0; j < offers_all.length; j++) {
        //console.log(offers_all[j].provider.toLowerCase());
        if (offers_all[j].provider.toLowerCase() == prov.toLowerCase()) {
            offers.push(offers_all[j]);
        }
    }
}

function filterProviders(optionslist) {
    if (optionslist.length == 0) {
        filterAll("");
        return;
    }
    providerlist = [];
    for (var i=0 ; i < optionslist.length; i++ ) {
        providerlist.push(optionslist[i].value);
    }
    offers = [];
    for (j=0; j < offers_all.length; j++) {
        if ($.inArray(offers_all[j].provider.toLowerCase(), providerlist) != -1) {
            //console.log("Accept "+ offers_all[j].provider);
            offers.push(offers_all[j]);
        }
    }
}


// Return Cost for given number of hours (period).
function getQuote4Hours(offer, h) {
    var cost = 0;
    if (offer.setup != "" ) {
        cost = offer.setup;
    }
    if (offer.hourly != "" ) {
        cost += h * offer.hourly;
    } else if (offer.weekly != "" ) {
        var period_w = Math.ceil(h / (24 * 7));
        cost += period_w * offer.weekly;
    } else if (offer.monthly != "" ) {
        period = hoursToHuman(h);
        more_than_month = 0;
        if (period[0].days > 0 || period[0].hours > 0) {
            more_than_month = 1;
        }
        cost += (period[0].years*12 + period[0].months + more_than_month) * offer.monthly;
        //console.log("Monthly: "+ offer.shortname + " "+offer.monthly);
        //console.log(period[0]);
    } else if (offer.yearly != "" ) {
        // Year is counted as 365 days
        var period_y = Math.ceil(period / (24 * 365));
        cost += period_y * offer.yearly;
    }
    return cost;
}


// Convert SUM in currency to base_currency
function convert2BaseCurrency(sum, currency) {
    if (currency != base_currency) {
        var conv = fx.convert(sum, { from: currency});
        //console.log(sum + " " +currency + " = " + conv + " " + base_currency );
        return conv;
    }
    return sum;
}


function getColor(prov) {
    var c = colors.length-1;
    //console.log("Pick color for "+ offer.provider.toLowerCase());
    switch (prov) {
        case "amazon":
            c = 0;
            break;
        case "softlayer":
            c = 1;
            break;
        case "nimbix":
            c = 2;
            break;
        case "cirrascale":
            c = 3;
            break;
        case "sakura":
            c = 4;
            break;
        case "leadertelecom":
            c = 5;
            break;
    };
    return c;
}


function ButtonOver(button) {
    if (button.title == "") {
        return;
    }
    var tmp = button.innerHTML;
    button.innerHTML = button.title;
    button.title = tmp;
}

function printRates() {
    var div = document.getElementById("rates");
    var cur = "JPY";
    var rate = fx.convert(1, {from: base_currency, to: cur});
    div.innerHTML = base_currency + "/" + cur +" = 1/" +rate.toFixed(2)+ " &nbsp; ";
    cur = "EUR";
    rate = fx.convert(1, {from: base_currency,to: cur});
    div.innerHTML += base_currency + "/" + cur+" = 1/"+rate.toFixed(2)+ " &nbsp; ";
    cur = "RUB";
    rate = fx.convert(1, {from: base_currency,to: cur});
    div.innerHTML += base_currency + "/" + cur+" = 1/"+rate.toFixed(2);
}