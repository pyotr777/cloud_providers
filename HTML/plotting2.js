
function ready() {
    msg = document.getElementById("messages");
    TimeCost = document.getElementById('time_x_cost');
    FLOPsScale = document.getElementById('FLOPsScale');
    msg.innerHTML = "Loading data...";
    getRates();

    $("select").select2();
    $("select").select2({  theme: "classic" });
}

document.addEventListener("DOMContentLoaded", ready);


var start_row = 2;
var dates =[];
var quotes=[];

var msg;
var TimeCost;
var FLOPsScale;




function continue_proc(filter, arg) {
    if (processing) return; // Prevent onchange event loop for providers filter
    processing = true;
    var TFLOPS = 1000000000;
    filter(arg);
    quotes=[];

    plotTimeCost(TFLOPS);
    plotFLOPsScale(TFLOPS);
    processing = false;
}


function plotTimeCost(TFLOPS) {
    console.log("Plotting GPU Time x Cost fot " + TFLOPS/1e+6 + " EFLOP-s 1*e18 FLOPS");
    var layout = {
        title:'GPU calculation Time and Cost for ' + TFLOPS/1e+6 + ' EFLOP-s ('+ TFLOPS/1e+6+' * 10<sup>18</sup> FLOP-s<sup>***</sup>)',
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
        },
        legend: {
            x: 0.98,
            y: 1,
            bordercolor: "#eee",
            borderwidth: 1,
            font: {
                size: 16
            }
        }
    };
    var traces = [];
    var last_prov="";
    var color_i = 0;
    var max_y = 0;
    var new_trace  = {};
    //console.log("New trace:" + new_trace+" Not empty? " + (!jQuery.isEmptyObject(new_trace)));
    for (j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        //console.log(j+" "+prov)
        if (last_prov != prov) {
            last_prov = prov;
            color_i = 0;
            var c = getColor(prov);
            //console.log("Color for "+ offers[j].provider+" is "+ c+ " ("+colors[c][0]+")");
            if (!jQuery.isEmptyObject(new_trace)) {
                traces.push(new_trace);
                new_trace=null;
            }
            new_trace = {
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
            if (color_i >= colors[c].length) {
                color_i = 0;
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
        new_trace.text.push(offers[j].provider + " " + offers[j].name + " ("+offers[j].shortname+")")
        new_trace.marker.color.push(colors[c][color_i]);
        //console.log(offers[j].shortname + " color:" + c + "x"+color_i);
    }
    layout.yaxis.range.push(max_y);
    //console.log("MAX Y set to " + max_y);
    if (new_trace) {
        traces.push(new_trace);
    }
    Plotly.newPlot('GPUtime_x_cost', traces, layout);


    // Plot CPU time
    var cpu_layout = {
        title:'CPU calculation Time and Cost for ' + TFLOPS/1e+6 + ' EFLOP-s ('+ TFLOPS/1e+6+' * 10<sup>18</sup> FLOP-s<sup>***</sup>)',
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
        },
        legend: {
            x: 0.98,
            y: 1,
            bordercolor: "#eee",
            borderwidth: 1,
            font: {
                size: 16
            }
        }
    };

    var cpu_traces = [];
    last_prov="";
    color_i = 0;
    max_y = 0;
    var new_trace_cpu = {};

    for (j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        //console.log(j+" "+prov)
        if (last_prov != prov) {
            last_prov = prov;
            color_i = 0;
            var c = getColor(prov);
            //console.log("Color for "+ offers[j].provider+" is "+ c+ " ("+colors[c][0]+")");
            if (!jQuery.isEmptyObject(new_trace_cpu)) {
                cpu_traces.push(new_trace_cpu);
                new_trace_cpu=null;
            }
            new_trace_cpu = {
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
                    symbol: "square"
                }
            }
        } else {
            color_i++;
            if (color_i >= colors[c].length) {
                color_i = 0;
            }
        }

        var time = Math.ceil(TFLOPS / offers[j].cpu_p / 3600); // Calculation time in hours
        var cost = getQuote4Hours(offers[j], time);
        new_trace_cpu.x.push(time);
        new_trace_cpu.y.push(cost);
        if (cost > max_y) {
            max_y = Math.ceil(cost*1.1);
        }
        cpu_layout.xaxis.tickvals.push(time);
        cpu_layout.xaxis.ticktext.push(hoursToHuman(time)[1]);
        new_trace_cpu.text.push(offers[j].provider + " " + offers[j].name + " ("+offers[j].shortname+")")
        new_trace_cpu.marker.color.push(colors[c][color_i]);
        //console.log(offers[j].shortname + " color:" + c + "x"+color_i);
    }
    cpu_layout.yaxis.range.push(max_y);
    //console.log("MAX Y set to " + max_y);
    if (new_trace_cpu) {
        cpu_traces.push(new_trace_cpu);
    }
    Plotly.newPlot('CPUtime_x_cost', cpu_traces, cpu_layout);
}


function plotFLOPsScale() {
    var x = [0.1, 0.5, 1, 5, 10, 50, 100, 200, 500, 800, 1000, 5000, 10000,];
    var div=document.getElementById("FLOPsScale");
    div.innerHTML = "Hover over number to update the two above graphs.<br>EFLOP-s: ";

    for (var i=0; i < x.length;i++) {
        div.innerHTML = div.innerHTML + " <span class='scale_number' onmouseover='javascript:plotTimeCost(" + x[i]*1e+6 + ");'> "+ x[i] + "</a>&nbsp;"
    }
}


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
        //console.log(accumulated_months_days);
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
    //console.log("Count "+init_h+ " hours as "+ s );
    return [{
        years: years,
        months: months,
        days: days,
        hours: hours
        }, s ];
}






