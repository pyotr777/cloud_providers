
function ready() {
    TimeCost = document.getElementById('time_x_cost');
    FLOPsScale = document.getElementById('FLOPsScale');
    getRates();
}

document.addEventListener("DOMContentLoaded", ready);


var start_row = 2;
var dates =[];
var quotes=[];

var msg;
var TimeCost;
var FLOPsScale;
var nodes_arr_ = [1,2,4,8,16,32,64];
var TFLOPs_arr_= [0.1, 0.5, 1, 5, 10, 50, 100];
var nodes_ = nodes_arr_[0];
var TFLOPs_ = TFLOPs_arr_[0]*1e+6;

function plotFilterPlots() {
    console.log("Plotting DC plots.");
    ndx = crossfilter(offers_all);
    plotGPUs();
    plotGPUperf();
    plotProviders();
    plotGPUmodels();
    plotCPUperf();
    plotMemory();
    dc.renderAll();
}



function continue_proc(filter, field, group) {
    if (processing) return; // Prevent onchange event loop for providers filter
    processing = true;
    filter(field, group);
    quotes=[];
    plotTimeCostMultiNode();
    plotFLOPsScale();
    plotNodesScale();
    processing = false;
}




// Return array of traces for given
//
function makeTraces(offers, performance) {
    var traces = [];
    var last_prov="";
    var last_nodes=0;
    var color_i = 0;
    var max_x = 0;
    var ys = [];
    var c = 0;
    var new_trace  = {};
    var showlegend = false;
    var TFLOPs = TFLOPs_;
    var nodes = nodes_;
    for (j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        //console.log(j+" "+prov)
        showlegend = false;
        if (last_prov != prov) {
            last_prov = prov;
            c = getColor(prov);
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
                    size: 14,
                    opacity: 0.7,
                    symbol: "circle",
                    line: {
                        width: 1,
                        color: 'rgba(0,0,0,0.7)'
                    }
                },
                hoverinfo: "text",
                info: []
            }
        }
        var seconds1 = Math.ceil(TFLOPs / offers[j][performance]); // Calculation time in seconds on 1 node.
        var seconds = Math.ceil(seconds1 / nodes); // Calculation time in seconds on "nodes" nodes.
        var cost1node = getQuote4Seconds(offers[j], seconds1, 1);
        var cost = getQuote4Seconds(offers[j], seconds, nodes);
        if (Math.abs(cost1node - cost) > 1 && offers[j].monthly != "") {  // This should not happen
            // Check
            console.log(offers[j].shortname + "\n Cost " + nodes+" nodes : "+cost+"/"+cost1node);
            console.log(" Time " + nodes+" nodes:"+ seconds + "/"+seconds1);
            console.log(" Tflops="+offers[j].gpu_p+ " cost="+offers[j].monthly);
        }
        new_trace.x.push(seconds);
        if (seconds > max_x) {
            max_x = seconds;
        }
        new_trace.y.push(cost);
        ys.push(cost);
        new_trace.info.push(getOfferInfo(offers[j]));
        new_trace.text.push(nodes + "nodes "+offers[j].provider + " "+offers[j].name + "<br>"+CurrencyFormat(cost, "USD")+"/"+secondsToHuman(seconds, true)[1]);
        new_trace.marker.color.push(colors[c][color_i]);
        //console.log(offers[j].shortname + " color:" + c + "x"+color_i);
    }
    if (new_trace) {
        traces.push(new_trace);
    }
    var y_max = getMaxRange(ys);
    var trace_obj = [traces, max_x, y_max];
    return trace_obj;
}


// Calculate standart deviation for the array,
// remove elements outside mean + 1*σ,
// return max of remaining elements.
function getMaxRange(x) {
    var mean = 0;
    var variance = 0;
    var deviation = 0;
    var sum = 0;
    var x_max=0;
    for (var i=0; i<x.length; i++) {
        sum += x[i];
        if (x_max < x[i]) {
            x_max = x[i];
        }
    }
    mean = sum / x.length;
    for (var i=0; i<x.length; i++) {
        variance += (x[i] - mean)*(x[i] - mean);
    }
    deviation = Math.sqrt(variance / x.length);
    //console.log("mean:"+mean+" max:"+x_max+" variance:"+variance+" deviation:"+deviation);
    var upper_limit = mean + 1*deviation;
    var y = [];
    for (var i=0; i<x.length; i++) {
        if (x[i] < upper_limit) {
            y.push(x[i]);
        }
    }
    x_max = 0;
    for (var i=0; i< y.length; i++) {
        if (x_max < y[i]) {
            x_max = y[i];
        }
    }
    return x_max;
}



// Plot time x cost graphs for multiple nodes
function plotTimeCostMultiNode() {
    var TFLOPs = TFLOPs_;
    var nodes = nodes_;
    //console.log("Plotting GPU Time x Cost for " + TFLOPs_ + " TFLOP-s, "+nodes_+" nodes");
    var cpu_plt = document.getElementById("CPUtime_x_cost");
    var hover_info2 = document.getElementById("offer_details2");
    var gpu_plt = document.getElementById("GPUtime_x_cost");
    var hover_info1 = document.getElementById("offer_details1");

    var nodes_txt="on 1 node";
    if (nodes > 1) {
        nodes_txt = " on "+nodes+" nodes"
    }
    var layout = {
        title:'GPU calculation time and cost for ' + TFLOPs/1e+6 + ' EFLOP-s<sup>***</sup>'+nodes_txt,
        hovermode: 'closest',
        showlegend: true,
        xaxis: {
            title: 'Calculation time',
            tickangle: 45,
            tickvals: [],
            ticktext: [],
            nticks: 5,
            tickfont: {
                family: '"Cabin Condensed", "Arial Narrow", sans-serif',
                size: 11
            },
            showline: true,
            rangemode: "tozero"
        },
        yaxis: {
            title: "Calculation cost (USD)",
            ticklen: 5,
            tickangle: 45,
            showexponent: "all",
            tickprefix: "$",
            //hoverformat: "$,.0f",
            tickfont: {
                family: '"Cabin Condensed", "Arial Narrow", sans-serif',
                size: 11
            },
            tickmode: "auto",
            rangemode: "tozero",
            showline: true
        },
        legend: {
            x: 0.99,
            xanchor: "right",
            y: 1,
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#eee",
            borderwidth: 1
        }
    };

    var traces_obj = makeTraces(offers, "gpu_p");
    var traces = traces_obj[0];
    var max_x = traces_obj[1];
    var max_y = traces_obj[2];
    var ticks = 10;
    var tick_interval = Math.ceil(max_x / ticks);
    for (var i=0; i <= max_x; i+=tick_interval) {
        layout.xaxis.tickvals.push(i);
        layout.xaxis.ticktext.push(secondsToHuman(i, true)[1]);
    }
    layout.yaxis.range = [0, max_y];

    Plotly.newPlot('GPUtime_x_cost', traces, layout);

    gpu_plt.on("plotly_hover", function(data) {
        hoverDisplay(data, hover_info1);
    });

    gpu_plt.on("plotly_unhover", function(data) {
        hover_info1.innerHTML = "&nbsp;";
        hover_info1.style.backgroundColor = "rgba(1,1,1,0)";
    });


    // Plot CPU time
    var cpu_layout = {
        title:'CPU calculation time and cost for ' + TFLOPs/1e+6 + ' EFLOP-s <sup>***</sup>'+nodes_txt,
        hovermode: 'closest',
        xaxis: {
            title: 'Calculation time',
            tickangle: 45,
            tickvals: [],
            ticktext: [],
            nticks: 5,
            tickfont: {
                family: '"Cabin Condensed", "Arial Narrow", sans-serif',
                size: 11
            },
            showline: true,
            rangemode: "tozero"
        },
        yaxis: {
            title: "Calculation cost (USD)",
            ticklen: 5,
            tickangle: 45,
            showexponent: "all",
            tickprefix: "$",
            //hoverformat: "$,.0f",
            tickfont: {
                family: '"Cabin Condensed", "Arial Narrow", sans-serif',
                size: 11
            },
            rangemode: "tozero",
            showline: true
        },
        legend: {
            x: 0.99,
            xanchor: "right",
            y: 1,
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#eee",
            borderwidth: 1
        }
    };

    traces_obj = makeTraces(offers, "cpu_p");
    var cpu_traces = traces_obj[0];
    max_x = traces_obj[1];
    max_y = traces_obj[2];
    cpu_layout.yaxis.range = [0, max_y];
    tick_interval = Math.ceil(max_x / ticks);
    for (var i=0; i <= max_x; i+=tick_interval) {
        cpu_layout.xaxis.tickvals.push(i);
        cpu_layout.xaxis.ticktext.push(hoursToHuman(i, true)[1]);
    }

    Plotly.newPlot('CPUtime_x_cost', cpu_traces, cpu_layout);

    cpu_plt.on("plotly_hover", function(data) {
        hoverDisplay(data, hover_info2);
    });

    cpu_plt.on("plotly_unhover", function(data) {
        hover_info2.innerHTML = "&nbsp;";
        hover_info2.style.backgroundColor = "rgba(1,1,1,0)";
    });
}


function plotFLOPsScale() {
    var x = TFLOPs_arr_;
    var div=document.getElementById("FLOPsScale");
    div.innerHTML = "";

    for (var i=0; i < x.length;i++) {
        div.innerHTML = div.innerHTML + " <span class='button' onclick='javascript:changeFLOPS("+x[i]*1e+6 + ")'> "+ x[i] + "</a>&nbsp;"
    }
}

function plotNodesScale() {
    var x = nodes_arr_;
    var div=document.getElementById("NodesScale");
    div.innerHTML = "";

    for (var i=0; i < x.length;i++) {
        div.innerHTML = div.innerHTML + " <span class='button' onclick='javascript:changeNodes("+x[i]+");'> "+ x[i] + "</a>&nbsp;"
    }
}


function changeFLOPS(flops) {
    TFLOPs_ = flops;
    plotTimeCostMultiNode();
}

function changeNodes(nodes) {
    nodes_ = nodes;
    plotTimeCostMultiNode();
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
        info.push(getOfferInfo(offers[j]));
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




