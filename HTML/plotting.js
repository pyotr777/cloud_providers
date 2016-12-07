
function ready() {
    //loadData("http://comp.photo777.org/cloudproviders/cost-performance.csv");
    loadData("cost-performance.csv");
    $("select").select2();
    $("select").select2({  theme: "classic" });
}

document.addEventListener("DOMContentLoaded", ready);

function loadData(filname) {
    Papa.parse(filname, {
        download: true,
        complete: processStaticData
    });
}

var offers_all=[];
var offers=[];
var start_row = 2;

function processStaticData(results) {
    console.log("Rows: "+results.data.length);
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
            hourly:    row[5],
            weekly:    row[6],
            monthly:   row[7],
            yearly:    row[8],
            cpu_p:     row[9],
            gpu_p:     row[10],
            gpu_model: row[11],
            gpus:      row[12],
            cpu_model: row[13],
            cpus:      row[14],
            memory:    row[15],
            hdd1:      row[16],
            hdd1_vol:  row[17],
            hdd2:      row[18],
            hdd2_vol:  row[19],
            net:       row[20],
            notes:     row[21]
        }
        offers_all.push(offer);
    }
    continue_proc(filterAll, "");
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


// Return array of Cost, Cost/CPU FLops, Cost/GPU FLops for given number of hours (period).
// Period must be in hours.
function getQuote(offer, step, period, dates) {
    var costs = [], costs_cpu=[], costs_gpu=[];
    if (offer.hourly != "" ) {
        for (var i=0; i <= period; i+=step) {
            cost = i * offer.hourly;
            costs.push(cost);
            costs_cpu.push(cost/offer.cpu_p);
            costs_gpu.push(cost/offer.gpu_p);
        }
    } else if (offer.weekly != "" ) {
        for (var i=0; i <= period; i+=step) {
            // Shift billing moments to one position later (use "i" instead of "i+1"),
            // so that 1 week (presize moment) counts for 1 week costs, not 2 weeks.
            period_w = Math.ceil((i) / (24 * 7));
            cost = period_w * offer.weekly;
            costs.push(cost);
            costs_cpu.push(cost/offer.cpu_p);
            costs_gpu.push(cost/offer.gpu_p);
        }
    } else if (offer.monthly != "" ) {
        for (var h=0; h <= period; h+=step) {
            // Shift billing moments to one position later,
            // so that 1 month (presize moment) counts for 1 month costs, not 2 months.
            var i = Math.floor(h/step) - 1;
            var period_m = 0;
            if ( i < 0 ) {
                i = 0;
            } else {
             period_m = dates[1][i].years * 12 + dates[1][i].months+1;
            }
            cost = period_m * offer.monthly;
            costs.push(cost);
            costs_cpu.push(cost/offer.cpu_p);
            costs_gpu.push(cost/offer.gpu_p);
        }
    } else if (offer.yearly != "" ) {
        for (var h=0; h <= period; h+=step) {
            // Shift billing moments to one position later
            var i = Math.floor(h/step) - 1;
            var period_y = 0;
            if ( i < 0 ) {
                i = 0;
            } else {
                period_y = dates[1][i].years+1;
            }
            cost = period_y * offer.yearly;
            costs.push(cost);
            costs_cpu.push(cost/offer.cpu_p);
            costs_gpu.push(cost/offer.gpu_p);
        }
    }
    return [ costs, costs_cpu, costs_gpu];
}

var days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
var accumulated_months_days = [];

// Convert time in hours to human readable format
// Return object {years, months, days, text}
function hoursToHuman(h) {
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
        s = s + years + " years ";
    }
    if ( months > 0) {
        s = s + months + " months ";
    }
    if ( days > 0) {
        s = s + days + " days ";
    }
    if ( hours > 0 || s.length < 2) {
        s = s + hours + " hours";
    }
    //console.log("Count "+init_h+ " hours as "+ s );
    return [{
        years: years,
        months: months,
        days: days,
        hours: hours
        }, s ];
}

// Return array of dates from 0 to given period of hours
// with 1 hour step. Second returned variable – array of years, months, days and hours and human readable labels.
function prepDates(end, step) {
    var h_arr = [];
    var human =[];
    var text  =[];
    start_date = 0;
    for (h = 0; h <= end; h+=step) {
        h_arr.push(h);
        human_time = hoursToHuman(h)
        human.push(human_time[0]);
        text.push(human_time[1]);
    }
    return [h_arr, human, text];
}

var dates =[];
var quotes=[];
var colors=[["#ffa20b"],  // Amazon
           ["#20d984"],  // Softlayer
           ["#517486"],  // Nimbix
           ["#5dbaff"],  // Cirrascale
           ["#ff5d5d"],  // Sakura
           ["#656565"]];

function getColor(offer) {
    var prov = offer.provider.toLowerCase();
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

// Plot all offers costs for given period.
function plotPeriod(period, step) {
    var tickvals = [];
    var ticktext = [];
    var traces = [];

    dates = prepDates(period, step);
    console.log(dates);
    // dates[0] - array of hours: 0,1,2,...,period
    // dates[1] - array of objects
    // dates[2] - array of human-readable text format dates
    //console.log("Period is " + period+" (" + dates[0][dates[0].length-1] + ") hours");
    //console.log("which is " + dates[2][dates[1].length-1]);
    //console.log("Test: is it 1 month? " + Math.floor(24*accumulated_months_days[0] /step));
    var layout = {
        title: 'Cost per period (USD)',
        hovermode:'closest',
        showticklabels: true,
        showlegend: false,
        margin: {
            t: 40,
            pad: 0
        },
        xaxis: {
            tickangle: 45,
            tickvals: [0, Math.floor(24*7),
                Math.floor(24*accumulated_months_days[0]),
                Math.floor(24*accumulated_months_days[1]),
                Math.floor(24*accumulated_months_days[2]),
                Math.floor(24*accumulated_months_days[3]),
                Math.floor(24*accumulated_months_days[4]),
                Math.floor(24*accumulated_months_days[5]),
                Math.floor(24*accumulated_months_days[6]),
                Math.floor(24*accumulated_months_days[7]),
                Math.floor(24*accumulated_months_days[8]),
                Math.floor(24*accumulated_months_days[9]),
                Math.floor(24*accumulated_months_days[10]),
                Math.floor(24*accumulated_months_days[11]) ],
            ticktext: ["0", "1 week", "1 month", "2 months", "3 months", "4 months", "5 months", "6 months", "7 months", "8 months", "9 months", "10 months", "11 months", "12 months"]
        },
        yaxis: {
            tickprefix: "$",
            hoverformat: ',.2f',
            exponentformat: "none"
        }
    };

    for (j=0; j < offers.length; j++) {
        quote = getQuote(offers[j], step, period, dates);
        var text = [];
        for (var i=0; i < dates[2].length; i++) {
            text.push(offers[j].shortname + " \n" + dates[2][i]);
        }
        var c = getColor(offers[j]);
        var trace = {
            mode: 'lines',
            line: {
                color: colors[c][0],
                width: 1.1
            },
            name: offers[j].shortname,
            longname: offers[j].provider+" "+offers[j].name,
            hoverinfo:"y+text",
            x: dates[0],
            text: text,
            y: quote[0] // 0 - Absolute cost
        };
        traces.push(trace);
        quotes.push(quote);
    }
    Plotly.newPlot("costs_period", traces, layout);
}

var step = 12; // hours step

function continue_proc(filter, arg) {
    if (accumulated_months_days.length < 1) {
        console.log("Calculate accumulated months days");
        accumulated_days = 0;
        for (var m = 0; m < 12; m++) {
            accumulated_days += days_in_month[m];
            accumulated_months_days.push(accumulated_days);
        }
        console.log(accumulated_months_days);
    }
    filter(arg);
    quotes=[];
    console.log("Have "+ offers.length+" offers.")
    plotPeriod(24*accumulated_months_days[11], step);  // Period for top plot
    console.log("Have "+ quotes.length+" quotes.")
    var myPlot = document.getElementById('costs_period');

    myPlot.on('plotly_click', function(data) {
        //console.log(data);
        var pts = '';
        for(var i=0; i < data.points.length; i++) {
            //console.log("Clicked: ");
            //console.log(data.points[i]);
            displaySlice(data.points[i].pointNumber);
            var point = data.points[i];
            newAnnotation = {
                x: point.xaxis.d2l(point.x),
                y: point.yaxis.d2l(point.y),
                arrowhead: 7,
                ax: 0,
                ay: -50,
                bgcolor: point.data.line.color,
                arrowwidth: 1.2,
                arrowcolor: '#303030',
                font: {size:12},
                bordercolor: '#707070',
                borderwidth: 2,
                borderpad: 4,
                text: '<b>' + dates[2][point.pointNumber]+'</b><br>'+point.data.longname+
                '<br>['+point.data.name +']'
            }
        }
        newIndex = (myPlot.layout.annotations || []).length;
        //console.log("newindex is "+newIndex);

         // delete instead if clicked twice
        if(newIndex) {
            var foundCopy = false;
            myPlot.layout.annotations.forEach(function(ann, sameIndex) {
                //console.log("annotations foreach with");
                //console.log(ann);
                //console.log(sameIndex);
                Plotly.relayout('costs_period', 'annotations[' + sameIndex + ']', 'remove');
            });
         }
         Plotly.relayout('costs_period', 'annotations[' + newIndex + ']', newAnnotation);
    });

    // Display data for 1 month
    displaySlice(Math.floor(24 * accumulated_months_days[0] / step));
    displayAbsoluteValues();
    plotTable();
}

// Argument in string
function displayTime(s) {
    var parts = s.split(" ");
    var i = parseInt(parts[0]);
    var n = i;
    switch (parts[1].toLowerCase()) {
        case "day":
        case "days":
            n = Math.floor(24/step) * i;
            break;
        case "month":
        case "months":
            n = accumulated_months_days[i-1] * Math.floor(24/step);
            break;
        case "year":
        case "years":
            n = i * accumulated_months_days[11] * Math.floor(24/step);
            break;
    }
    console.log("i="+i+ " "+parts[1]+ " n="+n);
    displaySlice(n);
}

var cpu_color = {light: "rgba(0, 126, 208, 0.33)", dark: "#007ed0"};
var gpu_color = {light: "rgba(252, 120, 36, 0.33)", dark: "#fc7824"};


// Argument is array index
function displaySlice(n) {
    console.log("Clicked "+n+ " X: "+ dates[0][n] + " / " + dates[2][n]);
    var layout_bar = {
        title: "1 TFlops cost per " + dates[2][n],
        barmode: 'group',
        hovermode:'closest',
        margin: {
            b: 120,
            t: 50
        },
        legend: {
            y: 1.05,
            orientation: "h",
            bgcolor: 'rgba(255, 255, 255, 0.5)',
        },
        xaxis: {
            fixedrange: true,
            tickangle: 45,
            tickfont: {
                family: 'Arial Narrow, sans-serif',
                size: 13,
                color: 'black'
            }
        },
        yaxis: {
            title: 'Cost per CPU 1 TFlops (USD/TFlops)',
            tickprefix: "$",
            hoverformat: ',.2f',
            exponentformat: "none",
            separatethousands: true,
            gridcolor: cpu_color.light,
            gridwidth: 1,
            linecolor: cpu_color.light
        },
        yaxis2: {
            title: 'Cost per GPU 1 TFlops (USD/TFlops)',
            overlaying: 'y',
            side: 'right',
            tickprefix: "$",
            hoverformat: ',.2f',
            exponentformat: "none",
            separatethousands: true,
            gridcolor: gpu_color.light,
            gridwidth: 1,
            linecolor: gpu_color.light
        }
    };
    var y_cpu = [];
    var y_gpu = [];
    var y_cost = [];
    var x = [];
    var c = [];
    console.log("displaySlice has " + offers.length+" offers.")
    for (j=0; j < offers.length; j++) {
        y_cpu.push(quotes[j][1][n]);
        y_gpu.push(quotes[j][2][n]);
        y_cost.push(quotes[j][0][n]);
        x.push(offers[j].shortname);
        c.push(colors[getColor(offers[j])][0]);
    }

    var trace_cpu = {
        x: x,
        y: y_cpu,
        name: "USD/CPU TFlops",
        offset: -0.35,
        width: 0.3,
        type: "bar",
        marker: {
            color: cpu_color.dark
        }
    };

    var trace_gpu = {
        x: x,
        y: y_gpu,
        name: "USD/GPU TFlops",
        type: "bar",
        offset: 0,
        width: 0.3,
        yaxis: 'y2',
        marker: {
            color: gpu_color.dark
        }
    };

    Plotly.newPlot('slice_cost_perf', [trace_cpu, trace_gpu], layout_bar);


    var layout_cost = {
        title: "Cost per "+dates[2][n]+ " (USD)",
        showlegend: false,
        margin: {
            b: 120,
            t: 50
        },
        xaxis: {
            fixedrange: true,
            tickangle: 45,
            tickfont: {
                family: 'Arial Narrow, sans-serif',
                size: 13,
                color: 'black'
            }
        },
        yaxis: {
            title: 'Cost (USD)',
            tickprefix: "$",
            hoverformat: ',.2f',
            exponentformat: "none",
            separatethousands: true
        }
    }
    var trace_cost = {
        x: x,
        y: y_cost,
        name: "USD",
        type: "bar",
        marker: {
            color: c
        }
    };
    console.log("Colors: " + c);
    Plotly.newPlot('slice_cost', [trace_cost], layout_cost);
}



function displayAbsoluteValues() {
    var layout_perf = {
        title: "CPU and GPU performance (TFlops)",
        barmode: 'group',
        hovermode:'closest',
        margin: {
            b: 120,
            t: 50
        },
        legend: {
            y: 1.05,
            orientation: "h",
            bgcolor: 'rgba(255, 255, 255, 0.5)',
        },
        xaxis: {
            fixedrange: true,
            tickangle: 45,
            tickfont: {
                family: 'Arial Narrow, sans-serif',
                size: 13,
                color: 'black'
            }
        },
        yaxis: {
            title: 'CPU performance (TFlops)',
            hoverformat: '.1f',
            exponentformat: "none",
            separatethousands: true,
            gridwidth: 1,
            gridcolor: cpu_color.light,
            gridwidth: 1,
            linecolor: cpu_color.light
        },
        yaxis2: {
            title: 'GPU performance (TFlops)',
            overlaying: 'y',
            side: 'right',
            hoverformat: '.1f',
            exponentformat: "none",
            separatethousands: true,
            gridcolor: gpu_color.light,
            gridwidth: 1,
            linecolor: gpu_color.light
        }
    }
    y_cpu = [];
    y_gpu = [];
    x = [];

    for (j=0; j < offers.length; j++) {
        y_cpu.push(offers[j].cpu_p);
        y_gpu.push(offers[j].gpu_p);
        x.push(offers[j].shortname);
    }

    var trace_cpu = {
        x: x,
        y: y_cpu,
        name: "CPU TFlops",
        offset: -0.35,
        width: 0.3,
        type: "bar",
        marker: {
            color: cpu_color.dark
        }
    };

    var trace_gpu = {
        x: x,
        y: y_gpu,
        name: "GPU TFlops",
        type: "bar",
        offset: 0,
        width: 0.3,
        yaxis: 'y2',
        marker: {
            color: gpu_color.dark
        }
    };

    Plotly.newPlot('slice_performance', [trace_cpu, trace_gpu], layout_perf);
}

function CurrencyFormat(s) {
    if (s == "") {
        return "";
    }
    if (s.indexOf("x")>=0) {
        return s;
    }
    num = Number(s).toLocaleString('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    num = num.replace(",", " ")
    return num
}

function NumberFormat(s) {
    if (s == "") {
        return "";
    }
    if (s.indexOf("x")>=0) {
        return s;
    }
    num = Number(s).toLocaleString('en', { style: 'decimal', maximumFractionDigits: 2 })
    num = num.replace(",", " ")
    return num
}

function plotTable() {
    var head = '<table class="wide_table">\
    <thead><tr><th rowspan="2">Provider</th> \
    <th rowspan="2">Offer</th><th colspan="2" class="double">GPU</th><th colspan="2" class="double">CPU</th> \
    <th>Memory</th><th colspan="4" class="quadruple">HDD</th> \
    <th>Network</th>\
    <th colspan="4" class="quadruple">Pricing (USD) per</th> \
    <th rowspan="2" class="notes_cell quadruple">Notes</th></tr> \
    <tr><th>model</th><th>quantity</th> \
    <th>model</th><th>quantity</th> \
    <th>RAM (GB)</th> \
    <th>primary</th><th>vol. (GB)</th><th>secondary</th><th>vol. (GB)</th> \
    <th>Internet (GB/s)</th> \
    <th>hour</th><th>week</th><th>month</th><th>year</th> \
    </tr></thead><tbody>';
    var body="";
    for (var j=0; j < offers.length; j++) {

        body += '<tr><td><a href="'+offers[j].provider_link+'" target="_blank">'+offers[j].provider+'</a></td><td>';
        if (offers[j].name_link != "") {
            body += '<a href="'+offers[j].name_link+'" target="_blank">'+offers[j].name+'</a>';
        } else {
            body += offers[j].name;
        }
        body += '</td> \
        <td>'+offers[j].gpu_model+'</td><td>'+offers[j].gpus+'</td>\
        <td>'+offers[j].cpu_model+'</td><td>'+offers[j].cpus+'</td>\
        <td>'+NumberFormat(offers[j].memory)+'</td>\
        <td>'+offers[j].hdd1+'</td><td>'+NumberFormat(offers[j].hdd1_vol)+'</td>\
        <td>'+offers[j].hdd2+'</td><td>'+NumberFormat(offers[j].hdd2_vol)+'</td>\
        <td>'+offers[j].net+'</td>\
        <td>'+CurrencyFormat(offers[j].hourly)+'</td>\
        <td>'+CurrencyFormat(offers[j].weekly)+'</td>\
        <td>'+CurrencyFormat(offers[j].monthly)+'</td>\
        <td>'+CurrencyFormat(offers[j].yearly)+'</td>\
        <td class="notes_cell">'+offers[j].notes+'</td></tr>';
    }

    var tail = '</tbody></table>';

    document.getElementById("table_div").innerHTML = head + body + tail;
}

function ButtonOver(button) {
    if (button.title == "") {
        return;
    }
    var tmp = button.innerHTML;
    button.innerHTML = button.title;
    button.title = tmp;
}

