var setRates = function(data) {
    fx.base = base_currency;
    fx.settings = { to: base_currency };
    fx.rates = data.rates

    //alert("£1 = $" + rate.toFixed(4));
    fx.rates[base_currency] = 1;

    console.log(fx.rates);
    console.log(fx.base);
    loadData("cost-performance.csv");
    //loadData("http://comp.photo777.org/cloudproviders/cost-performance.csv");
}


function ready() {
    var msg = document.getElementById("messages");
    msg.innerHTML = "Loading data...";
    getRates();

    $("select").select2();
    $("select").select2({  theme: "classic" });
}

document.addEventListener("DOMContentLoaded", ready);

function loadData(filename) {
    Papa.parse(filename, {
        download: true,
        complete: processStaticData
    });
}

var offers_all=[];
var offers=[];
var start_row = 2;
var dates =[];
var quotes=[];
var colors=[["#ffaa4b","#ff9e2b","#ffa943","#ffb152"],  // Amazon
           ["#ffe942","#ffde3d","#ffe55e","#ffe875"],  // Softlayer
           ["#8ad34f","#a1dc72","#a7dd7b","#a7dd7b"],  // Nimbix
           ["#8ed0ee","#8ad5ed","#95d5ef","#a3ddf1"],  // Cirrascale
           ["#f773a9","#f161a0","#ea6eaa","#ec8ec5"],  // Sakura
           ["#656565"]];
var TimeCost;
var FLOPsScale;
var base_currency="USD";


// Refer to
// http://openexchangerates.github.io/money.js/
function getRates() {
    $.getJSON("http://api.fixer.io/latest?base="+base_currency, setRates);
}




function processStaticData(results) {
    console.log("Rows: "+results.data.length);
    TimeCost = document.getElementById('time_x_cost');
    FLOPsScale = document.getElementById('FLOPsScale');
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
    var msg = document.getElementById("messages");
    msg.innerHTML = "";
    printRates();
}

function continue_proc(filter, arg) {
    var TFLOPS = 1000000000;
    filter(arg);
    quotes=[];

    plotTimeCost(TFLOPS);
    plotFLOPsScale(TFLOPS);
}


function plotTimeCost(TFLOPS) {
    console.log("Plotting GPU Time x Cost fot " + TFLOPS/1e+6 + " EFLOP-s 1*e+18 FLOPS");
    var layout = {
        title:'Calculation Time and Cost for ' + TFLOPS/1e+6 + ' EFLOP-s ('+ TFLOPS/1e+6+' * 10<sup>+18</sup> FLOP-s<sup>*</sup>)',
        hovermode: 'closest',
        xaxis: {
            title: 'Calculation time',
            tickangle: 45,
            tickvals: [],
            ticktext: [],
            tickfont: {
                family: '"Cabin Condensed", "Arial Narrow", "Helvetica", "Arial", sans-serif',
                size: 11
            },
            showline: true
        },
        yaxis: {
            tickprefix: "$",
            hoverformat: ',.2f',
            exponentformat: "none",
            zeroline: false,
            range: [0]
        }
    };
    var traces = [];
    var last_prov="";
    var color_i = 1;
    var max_y = 0;
    for (j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        //console.log(j+" "+prov)
        if (last_prov != prov) {
            last_prov = prov;
            color_i = 1;
            var c = getColor(prov);
            //console.log("Color for "+ offers[j].provider+" is "+ c+ " ("+colors[c][0]+")");
            if (new_trace) {
                traces.push(new_trace);
                new_trace=null;
            }
            var new_trace = {
                name: offers[j].provider,
                mode: "markers",
                type: "scatter",
                x: [],
                y: [],
                text: [],
                marker: {
                    color: [],
                    size: 15,
                    opacity: 0.8,
                    symbol: "diamond"
                }
            }
        } else {
            color_i++;
            if (color_i > 3) {
                color_i = 1;
            }
        }

        var time = Math.ceil(TFLOPS / offers[j].gpu_p / 3600); // Calculation time in hours
        var cost = getQuote4Hours(offers[j], time);
        new_trace.x.push(time);
        new_trace.y.push(cost);
        if (cost > max_y) {
            max_y = Math.ceil(cost*1.1);
        }
        layout.xaxis.tickvals.push(time);
        layout.xaxis.ticktext.push(hoursToHuman(time)[1]);
        //console.log(offers[j].shortname + " " + time + "(h) x" + cost + "($)");
        new_trace.text.push(offers[j].provider + " " + offers[j].name + " ("+offers[j].shortname+")")
        new_trace.marker.color.push(colors[c][color_i]);
    }
    layout.yaxis.range.push(max_y);
    console.log("MAX Y set to " + max_y);
    if (new_trace) {
        traces.push(new_trace);
    }
    Plotly.newPlot('time_x_cost', traces, layout);
}


function plotFLOPsScale() {
    var x = [0.1, 0.5, 1, 5, 10, 50, 100, 200, 500, 800, 1000, 5000, 10000,];
    var div=document.getElementById("FLOPsScale");
    div.innerHTML = "Hover over number to update the above graph.<br>EFLOP-s: ";

    for (var i=0; i < x.length;i++) {
        div.innerHTML = div.innerHTML + " <span class='scale_number' onmouseover='javascript:plotTimeCost(" + x[i]*1e+6 + ");'> "+ x[i] + "</a>&nbsp;"
    }
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
    } else if (offer.yearly != "" ) {
        // Year is counted as 365 days
        var period_y = Math.ceil(period / (24 * 365));
        cost += period_y * offer.yearly;
    }
    return cost;
}

var days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
var accumulated_months_days = [];

// Convert time in hours to human readable format
// Return object {years, months, days, text}
function hoursToHuman(h) {
    if (accumulated_months_days.length < 1) {
        //console.log("Calculate accumulated months days");
        accumulated_days = 0;
        for (var m = 0; m < 12; m++) {
            accumulated_days += days_in_month[m];
            accumulated_months_days.push(accumulated_days);
        }
        console.log(accumulated_months_days);
    }
    var init_h = h;
    var hours_day   = 24;
    var hours_year  = 24 * accumulated_months_days[11];


    var years  = Math.floor(h / hours_year);
    h = h - (years * hours_year);

    // Months
    // Have numbers of days in months, so need to know how many full days we have.
    var days = Math.floor(h / hours_day);
    var m = 0;
    for (; m < 12; m++ ) {
        if (days < accumulated_months_days[m]) {
            break;
        }
    }
    var months = m;
    //console.log("Calculating months. days="+days+" m="+m+ " months="+months+ " years="+years);

    if (months > 0) {
        h = h - accumulated_months_days[months-1] * hours_day;
    }

    // Days
    days   = Math.floor(h / hours_day);
    h = h - days * hours_day;

    // Hours
    var hours  = h;
    s = "";
    if ( years > 0) {
        s = s + years + "y. ";
    }
    if ( months > 0) {
        s = s + months + "m. ";
    }
    if ( days > 0) {
        s = s + days + "d. ";
    }
    if ( hours > 0 || s.length < 2) {
        s = s + hours + "h.";
    }
    console.log("Count "+init_h+ " hours as "+ s );
    return [{
        years: years,
        months: months,
        days: days,
        hours: hours
        }, s ];
}

// Convert SUM in currency to base_currency
function convert2BaseCurrency(sum, currency) {
    if (currency != base_currency) {
        var conv = fx.convert(sum, { from: currency});
        console.log(sum + " " +currency + " = " + conv + " " + base_currency );
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
    div.innerHTML = "* All sums are in " + base_currency+ ". Offers based on other currencies are converted using today's rates from <a href=http://www.ecb.europa.eu/stats/exchange/eurofxref/html/index.en.html target=_blank>European Central Bank</a>:<br>";
    var cur = "JPY";
    var rate = fx.convert(1, {from: base_currency, to: cur});
    div.innerHTML += base_currency + "/" + cur +" = 1/" +rate.toFixed(2)+ " &nbsp; ";
    cur = "EUR";
    rate = fx.convert(1, {from: base_currency,to: cur});
    div.innerHTML += base_currency + "/" + cur+" = 1/"+rate.toFixed(2)+ " &nbsp; ";
    cur = "RUB";
    rate = fx.convert(1, {from: base_currency,to: cur});
    div.innerHTML += base_currency + "/" + cur+" = 1/"+rate.toFixed(2);
}





