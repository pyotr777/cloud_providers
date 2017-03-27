// Library functions

var days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
var accumulated_months_days = [];
var colors=[["#ee8735","#ec7c19","#ff8e1c","#f6a94a","#fcd18c"],  // Amazon
           ["#fbee00","#f5e100","#fbee00","#fff57f","#fbf5a0"],  // Softlayer
           ["#3e9a36","#27bc49","#3bd771","#7fd993","#a7d398"],  // Nimbix
           ["#00b1e7","#11ade5","#51c1e4","#88dcef","#86e4fa"],  // Cirrascale
           ["#f0308b","#ec5896","#ff5a9f","#fe7bb0","#fe9ec1"],  // Sakura
           ["#964fb7","#8937a8","#9b49ba","#b970c4","#cb8edf"],  // LeaderTelecom
           ["#4f48d9","#4341ae","#5560c8","#7182e7","#afbdf5"],  // Tokyo University
           ["#ff5f51","#f5493c","#ff655c","#ff8a88","#ffb2b4"],  // MS
           ["#503a1b"]];  // other
var cpu_color = {light: "rgba(0, 126, 208, 0.33)", dark: "#007ed0"};
var gpu_color = {light: "rgba(252, 120, 36, 0.33)", dark: "#fc7824"};

var base_currency="USD";

var offers_all=[];
var offers=[];

var offers_GPU_filtered = offers_all;
var GPUgroup_global, optionslist_global;

var processing = false; // prevent onchange event loop for providers filter.

var setRates = function(data) {
    fx.base = base_currency;
    fx.settings = { to: base_currency };
    fx.rates = data.rates

    //alert("£1 = $" + rate.toFixed(4));
    fx.rates[base_currency] = 1;

    //console.log(fx.rates);
    //console.log(fx.base);
    loadData("./cost-performance.csv");
    //loadData("/cloudproviders/cost-performance.csv");
}


// Refer to
// http://openexchangerates.github.io/money.js/
function getRates() {
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
        if (provider=="the university of tokyo") {
            console.log(offer);
        } else {
            console.log(provider);
        }
    }
    continue_proc(resetFilters, "");
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
function resetFilters(arg) {
    offers = offers_all;
    offers_GPU_filtered = offers_all;
    GPUgroup_global = null;
    var $selector = $("#providers_select").select2();
    $selector.val(null).trigger("change");
}


// Filters offers: save filtered list in "offers" global variable.
// Filter out offers with GPUs in range given by group argument with format string "min-miax".
function filterByGPU(group) {
    console.log("Filtering by GPU group "+ group);
    GPUgroup_global = group;
    applyGPUFilter();
    applyProvidersFilter();
}


// Filter by provider
function filterProviders(optionslist) {
    if (optionslist == null || optionslist.length == 0) {
        resetFilters("");
        return;
    }
    optionslist_global = optionslist;
    applyGPUFilter();
    applyProvidersFilter();
}


function applyGPUFilter() {
    var group = GPUgroup_global;
    console.log("GPUgroup_global:"+GPUgroup_global);
    if (group == null) {
        offers = offers_all;
        offers_GPU_filtered = offers_all;
        return;
    }
    var new_offers = [];
    var available_offers = offers_all;
    console.log("Available offers "+available_offers.length)
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
    for (j=0; j < available_offers.length; j++) {
        if (available_offers[j].gpus >= min && available_offers[j].gpus <= max) {
            new_offers.push(available_offers[j]);
        }
    }
    offers = new_offers;
    offers_GPU_filtered = offers;
}



// Must be called after applyGPUFilter()
function applyProvidersFilter() {
    console.log("applying providers filter with " + optionslist_global+". Have "+offers_GPU_filtered.length + " GPU-filtered offers.")
    if (optionslist_global == null || optionslist_global.length == 0) {
        offers = offers_GPU_filtered;
        return;
    }
    var optionslist = optionslist_global;
    var providerlist = [];
    for (var i=0 ; i < optionslist.length; i++ ) {
        providerlist.push(optionslist[i].value);
    }
    var new_offers = [];
    var available_offers = offers_GPU_filtered;
    for (j=0; j < available_offers.length; j++) {
        //console.log(available_offers[j].provider.toLowerCase()+" is in "+providerlist+" ?");
        if ($.inArray(available_offers[j].provider.toLowerCase(), providerlist) != -1) {
            //console.log("Accept "+ offers_all[j].provider);
            new_offers.push(available_offers[j]);
        }
    }
    offers = new_offers;
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
        default:
            c = 8;
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
    console.log("Count " +months_total+ " months as "+hours+" hours.")
    return hours;
}
