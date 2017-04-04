
function ready() {
    msg = document.getElementById("messages");
    TimeCost = document.getElementById('time_x_cost');
    FLOPsScale = document.getElementById('FLOPsScale');
    msg.innerHTML = "Loading data...";
    getRates();

}

document.addEventListener("DOMContentLoaded", ready);


var start_row = 2;
var dates =[];
var quotes=[];

var msg;
var TimeCost;
var FLOPsScale;

function plotFilterPlots() {
    console.log("Plotting DC plots.");
    ndx = crossfilter(offers_all);
    plotPieGPUs();
    plotProviders();
    dc.renderAll();
}



function continue_proc(filter, field, group) {
    if (processing) return; // Prevent onchange event loop for providers filter
    processing = true;
    var TFLOPs = 1000000000;
    filter(field, group);
    quotes=[];
    //plotFLOPsMoney(25000);
    plotTimeCost(TFLOPs);
    plotFLOPsScale(TFLOPs);
    processing = false;
}


function plotTimeCost(TFLOPs) {
    console.log("Plotting GPU Time x Cost fot " + TFLOPs/1e+6 + " EFLOP-s 1*e18 FLOPS");
    var layout = {
        title:'GPU calculation Time and Cost for ' + TFLOPs/1e+6 + ' EFLOP-s ('+ TFLOPs/1e+6+' * 10<sup>18</sup> FLOP-s<sup>***</sup>)',
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

        var time = Math.ceil(TFLOPs / offers[j].gpu_p / 3600); // Calculation time in hours
        var cost = getQuote4Hours(offers[j], time);
        new_trace.x.push(time);
        new_trace.y.push(cost);
        if (cost > max_y) {
            max_y = Math.ceil(cost*1.1);
        }
        layout.xaxis.tickvals.push(time);
        layout.xaxis.ticktext.push(hoursToHuman(time, true)[1]);
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
        title:'CPU calculation Time and Cost for ' + TFLOPs/1e+6 + ' EFLOP-s ('+ TFLOPs/1e+6+' * 10<sup>18</sup> FLOP-s<sup>***</sup>)',
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

        var time = Math.ceil(TFLOPs / offers[j].cpu_p / 3600); // Calculation time in hours
        var cost = getQuote4Hours(offers[j], time);
        new_trace_cpu.x.push(time);
        new_trace_cpu.y.push(cost);
        if (cost > max_y) {
            max_y = Math.ceil(cost*1.1);
        }
        cpu_layout.xaxis.tickvals.push(time);
        cpu_layout.xaxis.ticktext.push(hoursToHuman(time, true)[1]);
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


function flopsForMoney(offer, sum) {
    var hours = getHours4Quote(offer,sum)
    var CPU_FOLPs = hours * offer.cpu_p * 3600; // CPU FLOPs for given hours
    var GPU_FOLPs = hours * offer.gpu_p * 3600;
    return [CPU_FOLPs, GPU_FOLPs]
}


function plotFLOPsMoney(sum) {
    console.log("EFLOPs for money $"+ sum);
    //var div_element = document.getElementById("flops_4money");
    var layout_bar = {
        title: "EFLOP-s for $" + sum,
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
            title: 'CPU EFLOPs',
            hoverformat: ',.2f',
            exponentformat: "none",
            separatethousands: true,
            gridcolor: cpu_color.light,
            gridwidth: 1,
            linecolor: cpu_color.light
        },
        yaxis2: {
            title: 'GPU EFLOPs',
            overlaying: 'y',
            side: 'right',
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
    var info = [];
    console.log("plotFLOPsMoney has " + offers.length+" offers.")
    var last_prov="";
    var color_i = 0;
    var c_max = 0;
    var color = "";
    for (j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        if (last_prov != prov) {
            last_prov = prov;
            color_i = 0;
            c_max = colors[getColor(prov)].length - 1;
        } else {
            color_i++;
            if (color_i > c_max) {
                color_i = 0;
            }
        }
        color = colors[getColor(prov)][color_i];
        //console.log("prov="+prov+" color_i="+ color_i + " cmax="+ c_max +" color="+color);
        flops = flopsForMoney(offers[j], sum)
        y_cpu.push(flops[0]/1e+6);
        y_gpu.push(flops[1]/1e+6);
        x.push(offers[j].shortname);
        c.push(color);
        info.push(getOfferInfo(j));
    }

    var trace_cpu = {
        x: x,
        y: y_cpu,
        name: "CPU TFLOPs",
        offset: -0.35,
        width: 0.3,
        type: "bar",
        marker: {
            color: cpu_color.dark
        },
        info: info,
        color: c
    };

    var trace_gpu = {
        x: x,
        y: y_gpu,
        name: "GPU TFLOPs",
        type: "bar",
        offset: 0,
        width: 0.3,
        yaxis: 'y2',
        marker: {
            color: gpu_color.dark
        },
        info: info,
        color: c
    };

    Plotly.newPlot('flops_4money', [trace_cpu, trace_gpu], layout_bar);
}




