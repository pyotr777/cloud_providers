
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

function continue_proc(filter, arg) {
    var TFLOPS = 1000000000;
    filter(arg);
    quotes=[];

    plotTimeCost(TFLOPS);
    plotFLOPsScale(TFLOPS);
}


function plotTimeCost(TFLOPS) {
    console.log("Plotting GPU Time x Cost fot " + TFLOPS + " TFLOP-s");
    var layout = {
        title:'Time x Cost for ' +TFLOPS+ ' TFLOP-s',
        hovermode: 'closest',
        projection: {
            y: {
                show: true
            }
        }
    };
    var traces = [];
    var last_prov="";
    var color_i = 1;
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
                    size: 12,
                    opacity: 0.8,
                    symbol: "x"
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
        //console.log(offers[j].shortname + " " + time + "(h) x" + cost + "($)");
        new_trace.text.push(offers[j].provider + " " + offers[j].name + " ("+offers[j].shortname+")")
        new_trace.marker.color.push(colors[c][color_i]);
    }
    if (new_trace) {
        traces.push(new_trace);
    }
    Plotly.newPlot('time_x_cost', traces, layout);
}


function plotFLOPsScale() {
    var x = [100000, 1000000, 10000000, 100000000, 1000000000, 10000000000, 100000000000];
    var trace = {
        x: x,
        fill: 'tozeroy',
        type: 'scatter'
    };
    var layout = {
        title:'TFLOP-s selector (hover)',
        hovermode: 'closest',
        xaxis: {
            type: 'log',
            autorange: true
        },
        yaxis: {
            showticklabels: false
        }
    }
    Plotly.newPlot('FLOPsScale', [trace], layout);
    FLOPsScale.on('plotly_hover', function(data) {
        for(var i=0; i < data.points.length; i++){
            pn = data.points[i].pointNumber;
            console.log(pn+" "+x[pn]);
            plotTimeCost(x[pn]);
        };
    });
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
function getQuote4Hours(offer, period) {
    if (offer.hourly != "" ) {
        return period * offer.hourly;
    } else if (offer.weekly != "" ) {
        var period_w = Math.ceil(period / (24 * 7));
        return period_w * offer.weekly;
    } else if (offer.monthly != "" ) {
        // Month is counted as 30 days
        var period_m = Math.ceil(period / (24 * 30));
        return period_m * offer.monthly;
    } else if (offer.yearly != "" ) {
        // Year is counted as 365 days
        var period_y = Math.ceil(period / (24 * 365));
        return period_y * offer.yearly;
    }
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
        s = s + years + " year ";
    }
    if ( months > 0) {
        if (months == 1) {
            s = s + months + " month ";
        } else {
            s = s + months + " months ";
        }
    }
    if ( days > 0) {
        if (days == 1) {
            s = s + days + " day ";
        } else {
            s = s + days + " days ";
        }
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

// Plot all offers costs for given period.
function plotPeriod(period, step, thin, thick) {
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

    var layout = {
        title: 'Cost for rent period* (USD)',
        hovermode:'closest',
        showticklabels: true,
        showlegend: true,
        legend: {
            orientation: "v",
            y: 0,
            x: 1
        },
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

    var last_prov = ""
    var color_i = 1;
    for (j=0; j < offers.length; j++) {
        quote = getQuote(offers[j], step, period, dates);
        var text = [];
        for (var i=0; i < dates[2].length; i++) {
            text.push(offers[j].provider+" "+offers[j].name+"\n("+offers[j].shortname + ")\n" + dates[2][i]);
        }
        var prov = offers[j].provider.toLowerCase();
        var c = getColor(prov);
        if (last_prov != prov) {
            console.log("Color for "+ offers[j].provider+" is "+ c+ " ("+colors[c][0]+")");
            last_prov = prov;
            color_i = 1;
            var legend_trace = {
                showlegend: true,
                legendgroup: prov,
                name: offers[j].provider,
                visible: true,
                type: "bar",
                x: [0],
                y: [1],
                marker: {
                    color: colors[c][0]
                }
            }
            traces.push(legend_trace)
        } else {
            color_i++;
            if (color_i > 3) {
                color_i = 1;
            }
        }
        var trace = {
            showlegend: false,
            legendgroup: prov,
            mode: 'lines',
            line: {
                color: colors[c][color_i],
                width: thin,
                shape: "linear",
                smoothing: 0
            },
            opacity:1,
            name: offers[j].shortname,
            longname: offers[j].provider+" "+offers[j].name,
            hoverinfo:"text+y",
            x: dates[0],
            text: text,
            y: quote[0] // 0 - Absolute cost
        };
        traces.push(trace);
        quotes.push(quote);
    }
    Plotly.newPlot("costs_period", traces, layout);
}




function removeAnnotations() {
    var myPlot = document.getElementById('costs_period');
    an = (myPlot.layout.annotations || []).length;
    console.log("annotations: "+an);
    for (var i=0; i < an; i++) {
        Plotly.relayout('costs_period', 'annotations[' + i + ']', 'remove');
    }
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
    removeAnnotations();
    displaySlice(n);
}

var cpu_color = {light: "rgba(0, 126, 208, 0.33)", dark: "#007ed0"};
var gpu_color = {light: "rgba(252, 120, 36, 0.33)", dark: "#fc7824"};


// Argument is array index
function displaySlice(n) {
    console.log(dates[1][n]);
    var months = dates[1][n].years*12 + dates[1][n].months;
    console.log("Clicked "+n+ " X: "+ dates[0][n] + ", full "+months+"months / " + dates[2][n]);
    // rewind to the beginning of the month
    var i = n;
    var point = 0;
    while (i > 0 && point == 0 ) {
        i--;
        if (dates[1][i].months != months) {
            point = i+1;
        }
    }
    console.log("Month start point: "+ point+" / "+dates[2][point]);
    // Set plot description period
    document.getElementById("r_period").innerHTML=dates[2][point];
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
    var y_cost_monthly = [];
    var x = [];
    var c = [];
    console.log("displaySlice has " + offers.length+" offers.")
    for (j=0; j < offers.length; j++) {
        y_cpu.push(quotes[j][1][n]);
        y_gpu.push(quotes[j][2][n]);
        y_cost.push(quotes[j][0][n]);
        //console.log("For monthly cost using point "+point + " with quote: "+quotes[j][0][point])
        y_cost_monthly.push(quotes[j][0][point]/months)
        x.push(offers[j].shortname);
        c.push(colors[getColor(offers[j].provider.toLowerCase())][0]);
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
        title: "Cost for "+dates[2][n],
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
    var trace_monthly_cost = {
        x: x,
        y: y_cost_monthly,
        name: "USD",
        type: "bar",
        marker: {
            color: c
        }
    };
    //console.log("Colors: " + c);
    Plotly.newPlot('slice_cost', [trace_cost], layout_cost);
    if (months >= 1) {
        document.getElementById('slice_cost_monthly').style.height= "300px";
        document.getElementById('slice_cost_monthly_text').style.display= "inline";
        layout_cost.title = "Cost per 1 month";
        Plotly.newPlot('slice_cost_monthly', [trace_monthly_cost], layout_cost);
    } else {
        document.getElementById('slice_cost_monthly').style.height= "0";
        document.getElementById('slice_cost_monthly_text').style.display= "none";
    }
}



function displayPerformanceScatter() {
    var layout = {
        title:'CPU and GPU performance (TFlops), memory volume (GB)',
        xaxis: {title: 'CPU performance (TFlops)'},
        yaxis: {title: 'GPU performance (TFlops)'},
        hovermode: 'closest'
    };
    //offers[j].provider
    //offers[j].name
    var traces = [];
    var memory_trace = {
        mode: "markers",
        type: "scatter",
        name: "RAM (GB)",
        x: [],
        y:[],
        text:[],
        marker: {
            sizemode: "area",
            size: [],
            color:"rgba(0,0,0,0)",
            line: {
                color: 'rgb(0,0,0)',
                width: 1
            }
        }
    };
    var last_prov="";
    var color_i = 1;
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
                    size: 12
                }
            }
        } else {
            color_i++;
            if (color_i > 3) {
                color_i = 1;
            }
        }
        new_trace.x.push(offers[j].cpu_p);
        new_trace.y.push(offers[j].gpu_p);
        new_trace.text.push(offers[j].provider + " " + offers[j].name + " ("+offers[j].shortname+")")
        new_trace.marker.color.push(colors[c][color_i]);

        memory_trace.x.push(offers[j].cpu_p);
        memory_trace.y.push(offers[j].gpu_p);
        memory_trace.text.push(offers[j].memory+" GB");
        memory_trace.marker.size.push(offers[j].memory);
    }
    if (new_trace) {
        traces.push(new_trace);
    }
    traces.push(memory_trace);
    //console.log(traces);
    Plotly.newPlot('scatter_performance', traces, layout);
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
    <th rowspan="2" class="quadruple">Offer</th><th class="double">GPU</th><th class="double">CPU</th> \
    <th>Memory</th><th colspan="4" class="quadruple">HDD</th> \
    <th>Network</th>\
    <th colspan="4" class="quadruple">Pricing (USD) per</th> \
    <th rowspan="2" class="notes_cell quadruple">Notes</th></tr> \
    <tr><th>model x quantity</th> \
    <th>model x quantity</th> \
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
        body += "<br><note>"+offers[j].shortname+"</note>";
        body += '</td> \
        <td>'+offers[j].gpu_model+' x '+offers[j].gpus+'</td>\
        <td>'+offers[j].cpu_model+' x '+offers[j].cpus+'</td>\
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
