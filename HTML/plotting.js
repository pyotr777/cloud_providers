
function ready() {
    msg = document.getElementById("messages");
    msg.innerHTML = "Loading data...";
    getRates();

    $("select").select2();
    $("select").select2({  theme: "classic" });
}

document.addEventListener("DOMContentLoaded", ready);


var dates =[];
var quotes=[];
var msg;


var step = 24; // hours step
var plot_period = 12; // months for plot "cost for rent period"
var ndx = null;

function plotFilterPlots() {
    console.log("Plotting DC plots.");
    ndx = crossfilter(offers_all);
    plotPieGPUs();
    plotProviders();
    dc.renderAll();
}

function continue_proc(filter, field, group) {
    if (processing) return;
    processing = true;
    // line width on graph
    var thin=0.8
    var thick=2

    if (accumulated_months_days.length < 1) {
        //console.log("Calculate accumulated months days");
        accumulated_days = 0;
        for (var m = 0; m < 12; m++) {
            accumulated_days += days_in_month[m];
            accumulated_months_days.push(accumulated_days);
        }
        //console.log(accumulated_months_days);
    }
    filter(field, group);

    msg.innerHTML = "";
    quotes=[];
    plotPeriod(getHours4Months(plot_period), step, thin, thick);  // Period for top plot
    console.log("Have "+ quotes.length+" quotes.")

    // Display data for 1 month by default
    displaySlice(Math.floor(24 * accumulated_months_days[0] / step));
    displayPerformanceScatter();
    plotTable();

    processing = false;
}


function plotPieGPUs() {
    console.log("Plot GPU numbers pie");
    var GPUsDim = ndx.dimension( function(d) { return d.gpus;});
    var gpus_total = GPUsDim.group();
    var GPUs_pie_chart = dc.rowChart("#dc_pie_gpus");
    GPUs_pie_chart
        .width(300).height(200)
        .dimension(GPUsDim)
        .group(gpus_total)
        .ordinalColors(other_colors)
        .legend(dc.legend().x(80).y(70).itemHeight(13).gap(5));
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
    var chart = dc.barChart("#dc_providers");
    chart
        .width(400)
        .height(200)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .yAxisLabel("Number of offers")
        .elasticX(true)
        .dimension(provider_dim)
        .group(provider_grp)
        .renderHorizontalGridLines(true)
        .ordinalColors(translateProvColors())
        .colorAccessor( function (d) {
            if (typeof d === "undefined") return;
            var c = getColor(d.key.toLowerCase());
            return c;
        })
        .ordering(function(d) { return getColor(d.key); })

    chart.on('filtered.monitor', function(chart, filter) {
        // report the filter applied
        console.log("DC event");
        console.log(chart.filters());
        continue_proc(filterByGroup, "provider", chart.filters());
    });

}


function displayPerformanceScatter() {
    var scatter_plt = document.getElementById("scatter_performance");
    var hover_info1 = document.getElementById("offer_details1");
    var layout = {
        title:'CPU and GPU performance** (TFlops), memory volume (GB)',
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
    var last_offer=""; // For removing offer duplicates hourly/weekly/monthly...
    var skip_words=["minutely", "hourly", "dayly", "weekly", "monthly", "yearly"];
    var color_i = 0;
    for (j=0; j < offers.length; j++) {
        var prov = offers[j].provider.toLowerCase();
        var offer_name = getSimpleName(offers[j].name,skip_words);
        if (last_offer == offer_name) {
            continue;
        } else {
            last_offer = offer_name;
        }
        //console.log(j+" "+prov)
        if (last_prov != prov) {
            last_prov = prov;
            color_i = 0;
            var c = getColor(prov);
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
                },
                info: []
            }
        } else {
            color_i++;
            if (color_i >= colors[c].length) {
                color_i = 0;
            }
        }
        new_trace.x.push(offers[j].cpu_p);
        new_trace.y.push(offers[j].gpu_p);
        new_trace.text.push(offers[j].provider + " " +offers[j].shortname)
        //console.log("Color for "+ offers[j].provider+"  offer is "+ color_i+ " ("+colors[c][color_i]+")");
        new_trace.marker.color.push(colors[c][color_i]);
        new_trace.info.push(getOfferInfo(j));

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

    scatter_plt.on("plotly_hover", function(data) {
        for (var i=0; i < data.points.length; i++) {
            var point = data.points[i];
            if (point.data.info == null) {
                return;
            }
            point_index = point.pointNumber;
            //console.log(point);
            hover_info1.innerHTML = hover_info1.innerHTML + " " +point.data.info[point_index];
            hover_info1.style.backgroundColor = point.data.marker.color[point_index];
            //console.log(point.data.info[point_index] + " " + point_index + " " + point.data.marker.color[point_index]);
        }
    });

    scatter_plt.on("plotly_unhover", function(data) {
        hover_info1.innerHTML = "";
        hover_info1.style.backgroundColor = "#fff";
    });
}




// Return array of Cost, Cost/CPU FLops, Cost/GPU FLops for given number of hours (period).
// Period must be in hours.
function getQuote(offer, step, period) {
    var costs = [], costs_cpu=[], costs_gpu=[];
    if (offer.time_limit != null && offer.time_limit != "") {
        period = offer.time_limit;
    }
    for (var i=0; i <= period; i+=step) {
        cost = getQuote4Hours(offer, i);
        costs.push(cost);
        costs_cpu.push(cost/offer.cpu_p);
        costs_gpu.push(cost/offer.gpu_p);
    }
    //console.log(offer.shortname+ " " + costs);
    return [ costs, costs_cpu, costs_gpu];
}



// Return array of dates from 0 to given period of hours
// with "step" hours step. Second returned variable – array of years, months, days and hours and human readable labels.
function prepDates(end, step) {
    var h_arr = [];
    var human =[];
    var text  =[];
    start_date = 0;
    for (h = 0; h <= end; h+=step) {
        h_arr.push(h);
        human_time = hoursToHuman(h, false)
        human.push(human_time[0]); // Object {years, months, days, hours}.
        text.push(human_time[1]);  // Human-readable text.
    }
    return [h_arr, human, text];
}



// Plot all offers costs for given period.
function plotPeriod(period, step, thin, thick) {
    var tickvals = [];
    var ticktext = [];
    var traces = [];

    dates = prepDates(period, step);
    //console.log(dates);
    // dates[0] - array of hours: 0,1,2,...,period
    // dates[1] - array of objects
    // dates[2] - array of human-readable text format dates
    //console.log("Period is " + period+" (" + dates[0][dates[0].length-1] + ") hours");
    //console.log("which is " + dates[2][dates[1].length-1]);

    var layout = {
        title: 'Cost* for rent period (USD)',
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
    var color_i = 0;
    for (j=0; j < offers.length; j++) {
        quote = getQuote(offers[j], step, period);
        var text = [];
        for (var i=0; i < dates[2].length; i++) {
            text.push(offers[j].provider+" "+offers[j].shortname + "\n" + dates[2][i]);
        }
        var prov = offers[j].provider.toLowerCase();
        var c = getColor(prov);
        if (last_prov != prov) {
            //console.log("Color for "+ offers[j].provider+" is "+ c+ " ("+colors[c][0]+")");
            last_prov = prov;
            color_i = 0;
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
            if (color_i >= colors[c].length) {
                color_i = 0;
            }
        }
        console.log("Color for "+ offers[j].provider+"  offer is "+ color_i+ " ("+colors[c][color_i]+")");
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
            text: text,
            hoverinfo:"text+y",
            x: dates[0],
            info: getOfferInfo(j),
            y: quote[0] // 0 - Absolute cost
        };
        traces.push(trace);
        quotes.push(quote);
    }
    Plotly.newPlot("costs_period", traces, layout);

    var myPlot = document.getElementById('costs_period');
    var hover_info2 = document.getElementById("offer_details2");

    myPlot.on('plotly_click', function(data) {
        //console.log(data);
        var pts = '';
        for(var i=0; i < data.points.length; i++) {
            //console.log("Clicked: ");
            //console.log(data.points[i]);
            displaySlice(data.points[i].pointNumber);
            var point = data.points[i];
            newannotations = [
                {
                    x: point.xaxis.d2l(point.x),
                    y: 150,
                    arrowhead: 0,
                    ax: 0,
                    ay: -250,
                    arrowwidth: 1,
                    arrowcolor: '#aaaaaa',
                    borderwidth: 0,
                    borderpad: 0,
                    text: ''
                },
                {
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
                ];
        }
        an = (myPlot.layout.annotations || []).length;

         // delete instead if clicked twice
        console.log("Annotations: "+an);
        for (var i=0; i < 2; i++) {
            if (an) {
                Plotly.relayout('costs_period', 'annotations[' + i + ']', 'remove');
            }
            Plotly.relayout('costs_period', 'annotations[' + i + ']', newannotations[i]);
        }
    });

    myPlot.on('plotly_hover', function(data) {
        //console.log(data.points[0]);
        var point = data.points[0];
        var update= {
            line: {
                color: point.fullData.line.color,
                width: thick
            },
            opacity: 1
        }
        Plotly.restyle('costs_period', update, [point.curveNumber]);
        if (point.data.info == null) {
            return;
        }
        hover_info2.innerHTML = hover_info2.innerHTML + " " +point.data.info;
        hover_info2.style.backgroundColor = point.fullData.line.color;
        //console.log(point.data.info + " " + point.fullData.line.color);
    });

    myPlot.on('plotly_unhover', function(data) {
        var update= {
            line: {
                color: data.points[0].fullData.line.color,
                width: thin
            },
            opacity: 1
        }
        Plotly.restyle('costs_period', update, [data.points[0].curveNumber]);
        hover_info2.innerHTML = "";
        hover_info2.style.backgroundColor = "#fff";
    });
}



function removeAnnotations() {
    var myPlot = document.getElementById('costs_period');
    an = (myPlot.layout.annotations || []).length;
    console.log("annotations: "+an);
    for (var i=0; i < an; i++) {
        Plotly.relayout('costs_period', 'annotations[' + i + ']', 'remove');
    }
}

// Argument is string
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
    //console.log("i="+i+ " "+parts[1]+ " n="+n);
    removeAnnotations();
    displaySlice(n);
}


// Argument is array index
function displaySlice(n) {
    //console.log(dates[1][n]);
    var months = dates[1][n].years*12 + dates[1][n].months;
    console.log("Clicked "+n+ " X: "+ dates[0][n] + ", full "+months+" months / " + dates[2][n]);
    // rewind to the beginning of the month
    var i = n;
    var point = 0;
    while (i > 0 && point == 0 ) {
        i--;
        if (dates[1][i].months != months) {
            point = i+1;
        }
    }
    //console.log("Month start point: "+ point+" / "+dates[2][point]);
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
    var info = [];
    console.log("displaySlice has " + offers.length+" offers.")
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
        y_cpu.push(quotes[j][1][n]);
        y_gpu.push(quotes[j][2][n]);
        y_cost.push(quotes[j][0][n]);
        y_cost_monthly.push(quotes[j][0][point]/months)
        x.push(offers[j].shortname);
        c.push(color);
        info.push(getOfferInfo(j));
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
        },
        info: info,
        color: c
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
        },
        info: info,
        color: c
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
        },
        info: info
    };
    var trace_monthly_cost = {
        x: x,
        y: y_cost_monthly,
        name: "USD",
        type: "bar",
        marker: {
            color: c
        },
        info: info
    };
    //console.log("Colors: " + c);
    Plotly.newPlot('slice_cost', [trace_cost], layout_cost);
    if (months > 1) {
        document.getElementById('slice_cost_monthly').style.height= "300px";
        document.getElementById('slice_cost_monthly_text').style.display= "inline";
        // Reuse layout for montly cost graph
        layout_cost.title = "Monthly cost for "+months + " months rent period";
        Plotly.newPlot('slice_cost_monthly', [trace_monthly_cost], layout_cost);
    } else {
        document.getElementById('slice_cost_monthly').style.height= "0";
        document.getElementById('slice_cost_monthly_text').style.display= "none";
    }

    var slice_cost_plot = document.getElementById("slice_cost");
    var slice_cost_monthly_plot = document.getElementById("slice_cost_monthly");
    var slice_cost_perf_plot = document.getElementById("slice_cost_perf");
    var hover_info3 = document.getElementById("offer_details3");
    var hover_info4 = document.getElementById("offer_details4");

    slice_cost_plot.on("plotly_hover", function(data) {
        for (var i=0; i < data.points.length; i++) {
            var point = data.points[i];
            if (point.data.info == null) {
                return;
            }
            point_index = point.pointNumber;
            hover_info3.innerHTML = hover_info3.innerHTML + " " +point.data.info[point_index];
            hover_info3.style.backgroundColor = point.data.marker.color[point_index];
            //console.log(point.data.info[point_index] + " " + point_index + " " + point.data.marker.color[point_index]);
        }
    });

    slice_cost_plot.on("plotly_unhover", function(data) {
        hover_info3.innerHTML = "&nbsp;";
        hover_info3.style.backgroundColor = "#fff";
    });

    if (months > 1) {
        slice_cost_monthly_plot.on("plotly_hover", function(data) {
            for (var i=0; i < data.points.length; i++) {
                var point = data.points[i];
                if (point.data.info == null) {
                    return;
                }
                point_index = point.pointNumber;
                hover_info3.innerHTML = hover_info3.innerHTML + " " +point.data.info[point_index];
                hover_info3.style.backgroundColor = point.data.marker.color[point_index];
                //console.log(point.data.info[point_index] + " " + point_index + " " + point.data.marker.color[point_index]);
            }
        });

        slice_cost_monthly_plot.on("plotly_unhover", function(data) {
            hover_info3.innerHTML = "&nbsp;";
            hover_info3.style.backgroundColor = "#fff";
        });
    }

    slice_cost_perf_plot.on("plotly_hover", function(data) {
        for (var i=0; i < data.points.length; i++) {
            var point = data.points[i];
            if (point.data.info == null) {
                return;
            }
            point_index = point.pointNumber;
            hover_info4.innerHTML = hover_info4.innerHTML + " " +point.data.info[point_index];
            hover_info4.style.backgroundColor = point.data.color[point_index];
            //console.log(point.data.info[point_index] + " " + point_index + " " + point.data.color[point_index]);
        }
    });

    slice_cost_perf_plot.on("plotly_unhover", function(data) {
        hover_info4.innerHTML = "&nbsp;";
        hover_info4.style.backgroundColor = "#fff";
    });
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

function NumberFormat(s) {
    if (s == "") {
        return "";
    }
    if (s.indexOf("x")>=0) {
        return s;
    }
    num = Number(s).toLocaleString('en', { style: 'decimal', maximumFractionDigits: 2 });
    num = num.replace(",", " ");
    return num;
}

function plotTable() {
    var head = '<table class="wide_table">\
    <thead><tr><th rowspan="2">Provider</th> \
    <th rowspan="2" class="quadruple">Offer</th><th class="double">GPU</th><th class="double">CPU</th> \
    <th>Memory</th><th colspan="4" class="quadruple">HDD</th> \
    <th>Network</th>\
    <th colspan="5" class="pentadruple">Pricing</th> \
    <th rowspan="2">Time limit (h)</th> \
    <th rowspan="2" class="pentadruple">Notes</th></tr> \
    <tr><th>model x quantity</th> \
    <th>model x quantity</th> \
    <th>RAM (GB)</th> \
    <th>primary</th><th>vol. (GB)</th><th>secondary</th><th>vol. (GB)</th> \
    <th>Internal/External (GB/s)</th> \
    <th>hourly</th><th>weekly</th><th>monthly</th><th>yearly</th><th title="One time setup price">Setup</th> \
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
        <td>'+CurrencyFormat(offers[j].hourly_native, offers[j].currency)+'</td>\
        <td>'+CurrencyFormat(offers[j].weekly_native,offers[j].currency)+'</td>\
        <td>'+CurrencyFormat(offers[j].monthly_native, offers[j].currency)+'</td>\
        <td>'+CurrencyFormat(offers[j].yearly_native, offers[j].currency)+'</td>\
        <td>'+CurrencyFormat(offers[j].setup_native, offers[j].currency)+'</td>\
        <td>'+offers[j].time_limit+'</td>\
        <td class="notes_cell">'+offers[j].notes+'</td></tr>';
    }

    var tail = '</tbody></table>';

    document.getElementById("table_div").innerHTML = head + body + tail;
}


var d3 = Plotly.d3;

// Plot histogram of number of offers for every number of GPUs
// split by providers.
function plotGPUsbyProvider() {
    providers_div = document.getElementById("providers");
    var gpus_obj = {};
    for (var j=0; j < offers_all.length; j++) {
        var provider = offers_all[j].provider.toLowerCase();
        if (!(provider in gpus_obj)) {
            // Create provider object inside pus_obj
            gpus_obj[provider] = {};
        }
        var gpus = offers_all[j].gpus;
        if (gpus in gpus_obj[provider]) {
            gpus_obj[provider][gpus]++;
        } else {
            // Create dictionary entry with name = number of gpus
            gpus_obj[provider][gpus] = 1;
        }
    }
    //console.log(gpus_obj);
    var traces = [];
    // loop by providers
    for(var key in gpus_obj) {
        var trace = {
            name: key,
            type: 'bar',
            x: [],
            y: [],
            marker: {
                color: colors[getColor(key)][0]
            }
        }

        for (var gpus in gpus_obj[key]) {
            trace.x.push(gpus);
            trace.y.push(gpus_obj[key][gpus]);
        }
        traces.push(trace);
    }
    console.log("traces:");
    console.log(traces);
    var layout = {
        barmode: 'stack',
        title: "Offers by number of GPUs",
        xaxis: {
            "type": 'category',
            "categoryorder": "category ascending"
        },
        height: 450,
        autosize: true
    };
    Plotly.newPlot('providers', traces, layout).then(attach);

    providers_div.on('plotly_click', function(data) {
        console.log("click");
        console.log(data);
    });
    providers_div.on('plotly_doubleclick', function(data) {
        console.log("plotly_doubleclick");
        console.log(data);
    });
    providers_div.on('plotly_selected', function(data) {
        console.log("plotly_selected");
        console.log(data);
    });
    providers_div.on('plotly_event', function(data) {
        console.log("plotly_event");
        console.log(data);
    });
}

function attach() {
    d3.select('g.legend').selectAll('.traces').each(function() {
        var item = d3.select(this);

        item.on('click', function(d) {
            console.log("Filter by " + d[0].trace.name);
            continue_proc(filterProv,d[0].trace.name);
        });
    });
    return false;
}


function filterProv(prov) {
    offers = [];
    for (var j=0; j < offers_all.length; j++) {
        if (offers_all[j].provider.toLowerCase() == prov ) {

        } else {
            offers.push(offers_all[j]);
        }
    }
}
