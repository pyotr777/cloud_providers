
function ready() {
    TimeCost = document.getElementById('time_x_cost');
    FLOPsScale = document.getElementById('FLOPsScale');
    global_var = {
        cpu: {
            TFLOPs: EFLOPs_arr_[0]*1e+6,
            nodes: nodes_arr_[0]
        },
        gpu: {
            TFLOPs: EFLOPs_arr_[0]*1e+6,
            nodes: nodes_arr_[0]
        },
    };
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
var EFLOPs_arr_= [0.1, 0.5, 1, 5, 10, 50, 100];
var global_var = {};

var axis_range_padding_koef = 1.1;


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
    plotTimeCostMultiNode("gpu");
    plotTimeCostMultiNode("cpu");
    plotFLOPsScale();
    plotNodesScale();
    processing = false;
}




// Return array of traces for given
//cpu_gpu: "cpu"/"gpu"
function makeTraces(offers, cpu_gpu,  marker) {
    var traces = [];
    var last_prov="";
    var last_nodes=0;
    var color_i = 0;
    var max_x = 0;
    var ys = [];
    var c = 0;
    var new_trace  = {};
    var showlegend = false;
    for (var j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        //console.log(j+" "+prov)
        showlegend = false;
        if (last_prov != prov) {
            last_prov = prov;
            c = getColor(prov);
            //console.log("Color for "+ offers[j].provider+" is "+ c+ " ("+colors[c][0]+")");
            if (!jQuery.isEmptyObject(new_trace.y)) {
                console.log("trace y = "+new_trace.y);
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
                    symbol: marker,
                    line: {
                        width: 1,
                        color: 'rgba(0,0,0,0.7)'
                    }
                },
                hoverinfo: "text",
                info: []
            }
        }
        var data = getData(offers[j],cpu_gpu);
        var seconds = data[0];
        var cost = data[1];
        if (cost > 0) {
            new_trace.x.push(seconds);
            if (max_x < seconds) {
                max_x = seconds*axis_range_padding_koef;
            }
            new_trace.y.push(cost);
            ys.push(cost);
            new_trace.info.push(getOfferInfo(offers[j]));
            new_trace.text.push(global_var[cpu_gpu].nodes + "nodes "+offers[j].provider + " "+offers[j].name + "<br>"+CurrencyFormat(cost, "USD")+"/"+secondsToHuman(seconds, true)[1]);
            new_trace.marker.color.push(colors[c][color_i]);
        }
        //console.log(offers[j].shortname + " max_x:" + max_x);
    }
    if (!jQuery.isEmptyObject(new_trace.y)) {
        console.log("trace y = "+new_trace.y);
        traces.push(new_trace);
    }
    var max_y = getMaxRange(ys);
    var trace_obj = [traces, max_x, max_y];
    console.log(trace_obj);
    return trace_obj;
}


// Return array of [time[], cost[]] for given offers.
// cpu_gpu is one of "gpu"  and "cpu"
function getData4offers(offers, cpu_gpu) {
    var time = [];
    var cost = [];
    var text = [];
    for (var j = 0; j < offers.length; j++) {
        var offer = offers[j];
        var data = getData(offer, cpu_gpu);
        if (data[1] >= 0) { // hide traces with cost < 0, which means they cannot be used with given nodes and time values
            time.push(data[0]);
            cost.push(data[1]);
            text.push(data[2]);
        }
    }
    return [time, cost, text];
}

// Return array [time, cost] for a given offer.
// cpu_gpu is one of "gpu"  and "cpu"
function getData(offer, cpu_gpu) {
    var performance = cpu_gpu + "_p";
    var TFLOPs = global_var[cpu_gpu].TFLOPs;
    var nodes = global_var[cpu_gpu].nodes;
    var time = Math.ceil(TFLOPs / offer[performance] / nodes); // time in seconds
    var hours = Math.ceil(time / 36) / 100; // time in hours
    var cost = getQuote4Seconds(offer, time, nodes);
    var text = nodes + "nodes "+offer.provider + " "+offer.name + "<br>"+CurrencyFormat(cost, "USD")+"/"+secondsToHuman(time, true)[1];
    return [hours, cost, text];
}


var duration = 4000;
var anim_opts = {frame: {duration: duration}, transition: {duration: duration * 0.5}};

// Animate to a new frame.
// performance is on of "gpu_p" and "cpu_p"
function updateFrame(gd, cpu_gpu) {
    console.log("\nupdateFrame "+cpu_gpu+" empty="+global_var[cpu_gpu].empty);
    if (global_var[cpu_gpu].empty == true) {
        plotTimeCostMultiNode(cpu_gpu);
        return;
    }
    var TFLOPs = global_var[cpu_gpu].TFLOPs;
    var nodes = global_var[cpu_gpu].nodes;
    var performance = cpu_gpu+"_p";
    var data = [];
    var trace_data = [];
    var one_trace_offers = [];
    var last_prov = "";
    for (var j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        if (last_prov != prov) {
            last_prov = prov;
            if (!jQuery.isEmptyObject(one_trace_offers)) {
                trace_data = getData4offers(one_trace_offers, cpu_gpu);
                if (trace_data[1].length > 0) {
                    data.push({x:trace_data[0],y:trace_data[1],text:trace_data[2]});
                }
                trace_data = [];
                one_trace_offers = [];
            }
        }
        one_trace_offers.push(offers[j]);
    }
    if (!jQuery.isEmptyObject(one_trace_offers)) {
        trace_data = getData4offers(one_trace_offers, cpu_gpu);
        if (trace_data[1].length > 0) {
            data.push({x:trace_data[0],y:trace_data[1],text:trace_data[2]});
        }
        trace_data = [];
        one_trace_offers = [];
    }
    global_var[cpu_gpu].empty = false;
    if (data.length == 0) {
        displayNoDataMessage(gd, cpu_gpu);
        return;
    }


    var layout = {
        title: getPlotTitle(cpu_gpu, TFLOPs, nodes)
    };
    Plotly.animate(gd, {data:data, layout:layout}, anim_opts);
    resizeLegend(gd);
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
            x_max = x[i]*axis_range_padding_koef;
        }
    }
    // For small arrays do not remove elements
    if (x.length < 12) {
        return x_max;
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
            x_max = y[i]*axis_range_padding_koef;
        }
    }
    return x_max;
}



// Plot time x cost graphs for multiple nodes
function plotTimeCostMultiNode(cpu_gpu) {
    var TFLOPs = global_var.gpu.TFLOPs;
    var nodes = global_var.gpu.nodes;
    if (cpu_gpu == "cpu") {
        var cpu_plt = document.getElementById("CPUtime_x_cost");
        var hover_info2 = document.getElementById("offer_details2");
    } else {
        var gpu_plt = document.getElementById("GPUtime_x_cost");
        var hover_info1 = document.getElementById("offer_details1");
    }

    if (cpu_gpu == "gpu") {
        var layout = {
            title: getPlotTitle("GPU", TFLOPs, nodes),
            hovermode: 'closest',
            showlegend: true,
            xaxis: {
                title: 'Calculation time (h)',
                tickangle: 45,
                //tickvals: [],
                //ticktext: [],
                //nticks: 5,
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
                //type:"log",
                showline: true
            },
            legend: {
                x: 1,
                xanchor: "right",
                y: 1,
                bgcolor: "rgba(255,255,255,0.8)",
                bordercolor: "#eee",
                borderwidth: 1
            }
        };

        var traces_obj = makeTraces(offers, "gpu","circle");
        var traces = traces_obj[0];
        if (traces.length == 0) {
            displayNoDataMessage('GPUtime_x_cost', cpu_gpu);
            return;
        }
        var max_x = traces_obj[1];
        var max_y = traces_obj[2];
        layout.yaxis.range = [0, max_y];
        layout.xaxis.range = [0, max_x];

        Plotly.newPlot('GPUtime_x_cost', traces, layout);

        gpu_plt.on("plotly_hover", function(data) {
            hoverDisplay(data, hover_info1);
        });

        gpu_plt.on("plotly_unhover", function(data) {
            hover_info1.innerHTML = "&nbsp;";
            hover_info1.style.backgroundColor = "rgba(1,1,1,0)";
        });

        // Resize legend
        var GPU_chart = d3.selectAll("#GPUtime_x_cost svg.main-svg").filter(function(d, i) { return i === 0 });
        var gpu_chart_width = GPU_chart.attr("width");
        console.log(gpu_chart_width);
        var legend_width = 190;
        var legend_shfit = 262;
        var gpu_legend_x = gpu_chart_width - legend_shfit;
        var legendGPU = d3.selectAll("#GPUtime_x_cost g.legend");
        var bg_GPU = d3.selectAll("#GPUtime_x_cost .legend rect.bg");
        bg_GPU.attr("width", legend_width);
        legendGPU.attr("transform", "translate("+gpu_legend_x+", 100)");
        if (traces.length > 0) {
            global_var[cpu_gpu].empty = false;
        } else {
            global_var[cpu_gpu].empty = true;
        }
        console.log("\nglobal "+ cpu_gpu + "="+global_var[cpu_gpu].empty);
    }

    if (cpu_gpu == "cpu") {
        // Plot CPU time
        TFLOPs = global_var.cpu.TFLOPs;
        nodes = global_var.cpu.nodes;
        var cpu_layout = {
            title: getPlotTitle("CPU", TFLOPs, nodes),
            hovermode: 'closest',
            showlegend: true,
            xaxis: {
                title: 'Calculation time (h)',
                tickangle: 45,
                //tickvals: [],
                //ticktext: [],
                //nticks: 5,
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

        traces_obj = makeTraces(offers, "cpu", "diamond");
        var cpu_traces = traces_obj[0];
        if (cpu_traces.length == 0) {
            displayNoDataMessage('CPUtime_x_cost', cpu_gpu);
            return;
        }
        max_x = traces_obj[1];
        max_y = traces_obj[2];
        cpu_layout.yaxis.range = [0, max_y];
        cpu_layout.xaxis.range = [0, max_x];

        var cpu_plot = Plotly.newPlot('CPUtime_x_cost', cpu_traces, cpu_layout);
        // Resize legend
        var CPU_chart = d3.selectAll("#CPUtime_x_cost svg.main-svg").filter(function(d, i) { return i === 0 });
        var cpu_chart_width = CPU_chart.attr("width");
        var legend_width = 190;
        var legend_shfit = 262;
        var cpu_legend_x = cpu_chart_width - legend_shfit;
        var legendCPU = d3.selectAll("#CPUtime_x_cost .legend");
        var bg_CPU = d3.selectAll("#CPUtime_x_cost .legend rect.bg");
        bg_CPU.attr("width", legend_width);
        legendCPU.attr("transform", "translate("+cpu_legend_x+", 100)");
        cpu_plt.on("plotly_hover", function(data) {
            hoverDisplay(data, hover_info2);
        });

        cpu_plt.on("plotly_unhover", function(data) {
            hover_info2.innerHTML = "&nbsp;";
            hover_info2.style.backgroundColor = "rgba(1,1,1,0)";
        });
        if (cpu_traces.length > 0) {
            global_var[cpu_gpu].empty == false;
        }
    }
}


function plotFLOPsScale() {
    var x = EFLOPs_arr_;
    var div1=document.getElementById("FLOPsScale");
    var div2=document.getElementById("FLOPsScale_cpu");
    div1.innerHTML = "";
    div2.innerHTML = "";

    for (var i=0; i < x.length;i++) {
        div1.innerHTML = div1.innerHTML + " <span class='button' onclick='javascript:changeFLOPSGPU("+x[i]*1e+6 + ")'> "+ x[i] + "</a>&nbsp;"
        div2.innerHTML = div2.innerHTML + " <span class='button' onclick='javascript:changeFLOPSCPU("+x[i]*1e+6 + ")'> "+ x[i] + "</a>&nbsp;"
    }
}

function plotNodesScale() {
    var x = nodes_arr_;
    var div1=document.getElementById("NodesScale");
    var div2 = document.getElementById("NodesScale_cpu");
    div1.innerHTML = "";
    div2.innerHTML = "";
    for (var i=0; i < x.length;i++) {
        div1.innerHTML = div1.innerHTML + " <span class='button' onclick='javascript:changeNodesGPU("+x[i]+");'> "+ x[i] + "</a>&nbsp;"
        div2.innerHTML = div2.innerHTML + " <span class='button' onclick='javascript:changeNodesCPU("+x[i]+");'> "+ x[i] + "</a>&nbsp;"
    }
}


// These functions called on button click events.
// They cause change in TFLOPS_ or nodes_ global variables and redraw graphs.
function changeFLOPSGPU(flops) {
    global_var["gpu"].TFLOPs = flops;
    updateFrame("GPUtime_x_cost","gpu");
}

function changeFLOPSCPU(flops) {
    global_var["cpu"].TFLOPs = flops;
    updateFrame("CPUtime_x_cost","cpu");
}

function changeNodesGPU(nodes) {
    global_var["gpu"].nodes = nodes;
    updateFrame("GPUtime_x_cost","gpu");
}

function changeNodesCPU(nodes) {
    global_var["cpu"].nodes = nodes;
    updateFrame("CPUtime_x_cost","cpu")
}


function getPlotTitle(gpu_cpu, TFLOPS,nodes) {
    var nodes_txt=" on 1 node";
    if (nodes > 1) {
        nodes_txt = " on "+nodes+" nodes"
    }
    var title = gpu_cpu.toUpperCase()+' time and cost for ' + TFLOPS/1e+6 + ' EFLOP-s'+nodes_txt;
    console.log(title);
    return title;
}

// Not used
function flopsForMoney(offer, sum) {
    var hours = getHours4Quote(offer,sum)
    var CPU_FOLPs = hours * offer.cpu_p * 3600; // CPU FLOPs for given hours
    var GPU_FOLPs = hours * offer.gpu_p * 3600;
    return [CPU_FOLPs, GPU_FOLPs]
}

// Not used
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




