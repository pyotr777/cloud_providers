// Library functions
var CSV_file = "./cost-performance.csv";
//var CSV_file = "/cloudproviders/cost-performance.csv";

var last_update = "Last update: 2017/04/05";

var days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
var accumulated_months_days = [];
var colors=[["#fd7b6e"],  // Amazon
           ["#de7643"],  // Softlayer
           ["#eeb85a"],  // Nimbix
           ["#efda65"],  // Cirrascale
           ["#eee892"],  // Sakura
           ["#cddcbf"],  // LeaderTelecom
           ["#79d0b6"],  // Tokyo University
           ["#98e2e3"],  // MS
           ["#6eabda"], // Google
           ["#6c7abc"]];  // other
var cpu_color = {light: "#c3d9f7", dark: "#7098d0"};
var gpu_color = {light: "#ffdfb2", dark: "#f99f46"};
var other_colors = ["#eca576","#ec9276","#e97e77","#d27486","#8e6bb4","#6766ce"];

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
        case "the university of tokyo":
            c = 6;
            break;
        case "ms azure":
            c = 7;
            break;
        case "google":
            c = 8;
            break;
        default:
            c = 9;
            break;
    };
    return c;
}


// Return porivder colors [0] in one-dimention array
function translateProvColors() {
    var cols = [];
    for (var j =0; j < colors.length; j++) {
        cols.push(colors[j][0]);
    }
    //console.log("Translated colors");
    //console.log(cols);
    return cols;
}

// Return array [0,1,2,3,...]
function getArraySizeOfProviders() {
    var arr = [];
    for (var j =0; j < colors.length; j++) {
        arr.push(j);
    }
    return arr;
}

var base_currency="USD";

var offers_all=[];
var offers=[];
var ndx = null;
var offers_GPU_filtered = offers_all;
var GPUgroup_global, optionslist_global;

var processing = false; // prevent onchange event loop for providers filter.

var setRates = function(data) {
    fx.base = base_currency;
    fx.settings = { to: base_currency };
    fx.rates = data.rates

    //alert("£1 = $" + rate.toFixed(4));
    fx.rates[base_currency] = 1;

    loadData(CSV_file);
}


// Refer to
// http://openexchangerates.github.io/money.js/
function getRates() {
    msg = document.getElementById("messages");
    msg.innerHTML = "Loading data...";
    document.getElementById("updated").innerHTML = last_update;

    $.getJSON("http://api.fixer.io/latest?base="+base_currency, setRates);
}


function loadData(filename) {
    console.log("Loading data");
    try {
        Papa.parse(filename, {
            download: true,
            complete: processStaticData
        });
    } catch (err) {
        console.log("Exception loding file "+filename+".");
        console.log(err.message);
    }
}


var start_row = 2;

function processStaticData(results) {
    console.log("Processing data");
    console.log("Rows: "+results.data.length);

    // Calculate hours in months
    accumulated_days = 0;
    for (var m = 0; m < 12; m++) {
        accumulated_days += days_in_month[m];
        accumulated_months_days.push(accumulated_days);
    }
    //var max_rows = 10000;

    var rows = results.data.length
    var provider = "";
    var provider_link = "";
    for (var i=start_row; i<rows; i++) {
        row = results.data[i];
        // skip empty row
        if (row.length < 2) {
            continue;
        }
        if (row[2] == "" && row[4] == "") {
            continue;
        }
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
            time_limit:row[23],
            notes:     row[24]
        }
        offers_all.push(offer);
    }
    plotFilterPlots();
    continue_proc(resetFilters, "");
    msg.innerHTML = "";
    printRates();
}


function plotGPUs() {
    console.log("Plot GPU numbers pie");
    var GPUsDim = ndx.dimension( function(d) { return d.gpus;});
    var gpus_total = GPUsDim.group();
    var GPUs_pie_chart = dc.rowChart("#dc_pie_gpus");
    GPUs_pie_chart
        .width(210).height(200)
        .dimension(GPUsDim)
        .group(gpus_total)
        .ordinalColors(other_colors)
        .legend(dc.legend().x(80).y(70).itemHeight(13).gap(5))
        .xAxis().ticks(4);
        //.renderlet(function (chart) {
        //    chart.selectAll("g.row text")
        //    .attr("transform", "translate(-30, 0)");
        //});

    GPUs_pie_chart.on('filtered.monitor', function(chart, filter) {
        // report the filter applied
        console.log("DC event");
        console.log(chart.filters());
        continue_proc(filterByGroup, "gpus", chart.filters());
    });
}


function plotProviders() {
    console.log("Plot providers");
    var provider_dim = ndx.dimension( function (d) { return d.provider;});
    var provider_grp = provider_dim.group();
    var chart = dc.rowChart("#dc_providers");
    chart
        .width(250)
        .height(300)
        .dimension(provider_dim)
        .group(provider_grp)
        //.x(d3.scale.ordinal())
        //.xUnits(dc.units.ordinal)
        //.yAxisLabel("Number of offers")
        //.renderHorizontalGridLines(true)
        .colors(d3.scale.ordinal().domain(getArraySizeOfProviders())
                .range(translateProvColors()))
        .colorAccessor( function (d) {
            if (typeof d === "undefined") return colors.length-1;
            var c = getColor(d.key.toLowerCase());
            return +c;
        })
        .ordering(function(d) { return getColor(d.key.toLowerCase()); })

    chart.on('filtered.monitor', function(chart, filter) {
        // report the filter applied
        console.log("DC event");
        console.log(chart.filters());
        continue_proc(filterByGroup, "provider", chart.filters());
    });

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
function resetFilters(arg) {
    offers = offers_all;
    GPU_filters = [];
    provider_filters = [];
}

var GPU_filters = [];
var provider_filters = [];


// Filters offers: save filtered list in "offers" global variable.
// Filter out offers by numbet of GPUs and by providers.
// Filter settings (selected values) are stored in global variables GPU_filters and provider_filters.
// Filter offers_all by applying 2 filters one by one.
function filterByGroup(fieldname, group) {
    console.log("Filtering by "+fieldname+" : "+ group);
    switch (fieldname) {
        case "gpus":
            GPU_filters = group;
            break;
        case "provider":
            provider_filters = group;
            break;
    }
    offers = applyFilter(offers_all, "gpus", GPU_filters);
    offers = applyFilter(offers, "provider", provider_filters);
}


// Filter offers_ (input parameter) by leaving only offers
// with fieldname (input parameter) values from array group (input parameter).
function applyFilter(offers_, fieldname, group) {
    if (group.length == 0) {
        console.log(fieldname+" filter empty");
        return offers_;
    }
    var filtered_offers=[];
    for (var j=0; j < offers_.length; j++) {
        if (group.indexOf(offers_[j][fieldname]) >=0 ) {
            filtered_offers.push(offers_[j]);
        }
    }
    return filtered_offers;
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
        var period_y = Math.ceil(h / (24 * 365));
        cost += period_y * offer.yearly;
    }
    return cost;
}

// Return time in hours for how long one can rent an offer for the given sum
function getHours4Quote(offer, sum) {

    if (offer.setup != "" ) {
        // Subtract setup cost
        sum = sum - offer.setup;
    }
    console.log("hours4quote "+offer.shortname+" sum="+sum);
    if (sum <=0) {
        return 0;
    }
    var h = 0;
    if (offer.hourly != "" ) {
        h = Math.floor(sum / offer.hourly); // max hours can rent for given sum.
        //console.log("hours4quote "+offer.shortname+" hours="+h);
    } else if (offer.weekly != "" ) {
        var period_w = Math.floor(sum  / offer.weekly);
        //console.log("hours4quote "+offer.shortname+" weeks="+period_w);
        h = period_w * (24 * 7);
    } else if (offer.monthly != "" ) {
        var period_m = Math.floor(sum  / offer.monthly);
        //console.log("hours4quote "+offer.shortname+" months="+period_m);
        h = getHours4Months(period_m);
    } else if (offer.yearly != "" ) {
        var period_y = Math.floor(sum  / offer.yearly);
        console.log("hours4quote "+offer.shortname+" years="+period_y);
        h = getHours4Months(period_y * 12);
    } else {
        console.log(offer);
    }
    return h;
}

// Convert SUM in currency to base_currency
function convert2BaseCurrency(sum, currency) {
    if (sum == null || sum == "") return "";
    if (currency != base_currency) {
        try {
            var conv = fx.convert(sum, { from: currency});
            //console.log(sum + " " +currency + " = " + conv + " " + base_currency );
            return conv;
        } catch(err) {
            console.log("Currency convertion exeption for "+sum+ currency+".");
            console.log(err.message);
            return 0;
        }
    }
    return sum;
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

// Transform Offer name to simplified form for comparison with other names
function getSimpleName(name,skip_words) {
    var simple_name = name.toLowerCase();
    for (var i=0; i < skip_words.length; i++) {
        simple_name = simple_name.replace(skip_words[i],"");
    }
    return simple_name;
}


// Convert time in hours to human readable format
// Return object {years, months, days, hours}.
// Second returned value is text representation.
function hoursToHuman(h, short) {
    if (accumulated_months_days.length < 1) {
        //console.log("Calculate accumulated months days");
        accumulated_days = 0;
        for (var m = 0; m < 12; m++) {
            accumulated_days += days_in_month[m];
            accumulated_months_days.push(accumulated_days);
        }
        //console.log(accumulated_months_days);
    }
    var human_text_long = {
        years:" year ",
        month: " month ",
        months: " months ",
        day: " day ",
        days: " days ",
        hours: " hours "
    }
    var human_text_short = {
        years:"y. ",
        month: "m. ",
        months: "m. ",
        day: "d. ",
        days: "d. ",
        hours: "h. "
    }
    var human_text = null;
    if (short == true) {
        human_text = human_text_short;
    } else {
        human_text = human_text_long;
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
        s = s + years + human_text.years;
    }
    if ( months > 0) {
        if (months == 1) {
            s = s + months + human_text.month;
        } else {
            s = s + months + human_text.months;
        }
    }
    if ( days > 0) {
        if (days == 1) {
            s = s + days + human_text.day;
        } else {
            s = s + days + human_text.days;
        }
    }
    if ( hours > 0 || s.length < 2) {
        s = s + hours + human_text.hours;
    }
    //console.log("Count "+init_h+ " hours as "+ s );
    return [{
        years: years,
        months: months,
        days: days,
        hours: hours
        }, s ];
}


function getHours4Months(months) {
    var hours = 0;
    var months_total = months;
    while (months > 11) {
        hours += 24*accumulated_months_days[11]; // Should be 24*365 = 8760 (hours in a year).
        months -= 12;
    }
    if (months > 0) {
        hours += 24*accumulated_months_days[months-1];
    }
    //console.log("Count " +months_total+ " months as "+hours+" hours.")
    return hours;
}


function CurrencyFormat(s, currency) {
    if (s == "") {
        return "";
    }
    //console.log("Formatting " + s + " as " + currency);
    num = Number(s).toLocaleString('en', { style: 'currency', currency: currency, maximumFractionDigits: 2 });
    num = num.replace(",", "&nbsp;");
    return num;
}


