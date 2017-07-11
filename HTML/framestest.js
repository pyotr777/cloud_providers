document.addEventListener("DOMContentLoaded", ready);

var colors=[["#fa6d44", "#ff6a3f"],  // Amazon
           ["#f8a358", "#ffa85c"],  // IBM
           ["#ffd879", "#fccd5f"],  // Nimbix
           ["#efd5c0", "#f0cbb3"],  // Cirrascale
           ["#f5a1c0", "#f5a1c0"],  // Sakura
           ["#b9b7f4", "#b3b1fa"],  // LeaderTelecom
           ["#94c7ff", "#94c7ff"],  // Tokyo University
           ["#589ff4", "#589ff4"],  // MS
           ["#8be2fd", "#8be2fd"], // Google
           ["#d7f0d4", "#d7f0d4"],  // IDCF
           ["#d1e69b", "#d3eb96"],  // Tsubame
           ["#a3edc6", "#a3edc6"],  //
           ["#7dd8a8","#7dd8a8"],];  //

function newTrace(name,j) {
    var new_trace = {
        name: name,
        mode: "markers",
        type: "scatter",
        x: [],
        y: [],
        text: name,
        marker: {
            color: colors[j][0],
            size: 14,
            opacity: 0.7,
            symbol: "circle",
            line: {
                width: 1,
                color: 'rgba(0,0,0,0.7)'
            }
        },
        hoverinfo: "text",
    };
    var data = fillData();
    new_trace.x = data[0];
    new_trace.y = data[1];
    return new_trace;
}


function fillData() {
    var x = [];
    var y = [];
    for (var i=0; i < 5; i++) {
        x.push(i+Math.random()-0.5);
        y.push(Math.random());
    }
    return [x, y];
}

var layout = {};
var traces = [];
function ready() {
    layout = {
        title:'GPU calculation time and cost EFLOP-s<sup>***</sup>',
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
    traces=[];
    for (var j=0; j < 5; j++) {
        var trace=newTrace("offer"+j,j);
        traces.push(trace);
    }
    Plotly.plot('graph', traces, layout);
}

var frame_counter=0;
function randomize() {
    frame_counter++;
    var data = [];
    for (var t=0; t < traces.length; t++) {
        var trace_data = fillData();
        data.push({x:trace_data[0], y: trace_data[1]})
    }
    //console.log(data);
    //Plotly.addFrames('graph', [{
    //    data: data,
    //    name: "frame"+frame_counter
        //traces: traces[0],
        //layout: layout
    //}]);
    console.log("frame"+frame_counter);
    Plotly.animate("graph", {data: data}, animOpts);
}

var duration = 1000;
var animOpts = {frame: {duration: duration}, transition: {duration: duration * 0.5}};
function reset() {
    Plotly.animate("graph",["frame1","frame2"], animOpts);
}