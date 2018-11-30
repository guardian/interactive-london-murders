import * as d3B from 'd3'
import * as d3Select from 'd3-selection'
import * as d3geo from 'd3-geo'
import * as topojson from 'topojson'
import * as d3GeoProjection from "d3-geo-projection"
import { $ } from "./util"

let d3 = Object.assign({}, d3B, d3Select, d3geo, d3GeoProjection);



const boroughsURL = "<%= path %>/assets/boroughs.json";
const areasURL = "<%= path %>/assets/a.json";
const murdersURL = "<%= path %>/assets/London murders 2018 - Sheet6.csv";

let padding = 12;

const mapEl = $(".murders-type");

const monthsString = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let annotation = d3.select(".map-annotation");
let annotationLatLong = [-0.02, 51.65]
annotation.style('display', 'none')

let width = mapEl.getBoundingClientRect().width - padding;
let height = width*(711 / 860) - padding;
let isMobile

if(width < 600)
{
	isMobile = true
}
else
{
	isMobile = false
}

let murdersMap = d3.select(".murders-type")
.append("svg")
.attr("width", width)
.attr("height", height);

let smallMultiples = d3.select(".small-multiples")

let projection = d3.geoMercator()

let path = d3.geoPath()
.projection(projection);


let voronoi = d3.voronoi()
.extent([[-1, -1], [width + 1, height + 1]]);

let boroughs;
let boroughsMerged;
let areas;
let murders;

Promise.all([
	d3.json(boroughsURL),
	d3.json(areasURL),
	d3.csv(murdersURL)
	])
.then(ready)


function ready(data)
{
	boroughs = topojson.feature(data[0], data[0].objects['london_boroughs_proper']);
	boroughsMerged = topojson.merge(data[0], data[0].objects['london_boroughs_proper'].geometries);
	areas = topojson.feature(data[1], data[1].objects['london-areas']);
	murders = data[2]

	makeMainMap()
	makeSmallMultiples()
}

window.onresize = function(event)
{
	

	width = mapEl.getBoundingClientRect().width - padding;
	height = width*(711 / 860) - padding;

	if(width - padding < 600)
	{
		isMobile = true
	}
	else
	{
		isMobile = false
	}

	murdersMap.attr('width', width)
	murdersMap.attr('height', height)
	makeMainMap()
	makeSmallMultiples()
}
function makeSmallMultiples()
{
	smallMultiples.selectAll('div').remove();

	let months = []
	let positionsByMonth = []
	let positionsAcumm = []

	murders.map(m => {
		let month = +m.Date.split('-')[1]
		let day = +m.Date.split('-')[2]
		let date = new Date(2018, month -1, day)
		if(months.indexOf(date.getMonth()) == -1){
			months.push(date.getMonth())
			positionsByMonth[date.getMonth()] = []
		}

		positionsByMonth[date.getMonth()].push(m)	

	})

	months.reverse()

	months.map((m,i) => {
		let div = smallMultiples.append('div')
		.attr('class', 'small-multiple-wrapper')

		let divEl = $(".small-multiple-wrapper")
		let divWidth =0;

		console.log(isMobile)

		if(isMobile)divWidth = 140
			else divWidth=200

		

		let total = div.append('div')
		.attr('class', 'small-multiple-total')
		.html(positionsByMonth[m].length)

		let month = div.append('div')
		.attr('class', 'small-multiple-month')
		.html(monthsString[m])

		let map = div.append('svg')
		.attr('width',divWidth)
		.attr('height',200)

		projection.fitSize([divWidth, 200], boroughs);

		map.selectAll('.borough')
		.data(boroughs.features)
		.enter()
		.append('path')
		.attr('d', path)
		.attr('class', 'borough-small-multiples')

		let positions = []

		map.selectAll(".small-multiples-circle-past")
		.data(positionsAcumm)
		.enter()
		.append('circle')
		.attr('class', "small-multiples-circle-past")
		.attr('cx', d => d.cx)
		.attr('cy', d => d.cy)
		.attr('r', d => d.r);

		positionsByMonth[m].map(p => {

			positions.push({
				cx: projection([+p.long, +p.lat])[0],
				cy: projection([+p.long, +p.lat])[1],
				r:2.5
			})

			positionsAcumm.push({
				cx: projection([+p.long, +p.lat])[0],
				cy: projection([+p.long, +p.lat])[1],
				r:2.5
			})

		})

		map.selectAll(".small-multiples-circle")
		.data(positions)
		.enter()
		.append('circle')
		.attr('class', "small-multiples-circle")
		.attr('cx', d => d.cx)
		.attr('cy', d => d.cy)
		.attr('r', d => d.r);
		
	})
}

function makeMainMap()
{
	murdersMap.selectAll('path').remove()
	murdersMap.selectAll('circle').remove()

	projection.fitSize([width, height], boroughs);

  	d3.select(".murders-standfirst-number").html(murders.length)

	murdersMap.selectAll('.area')
	.data(areas.features)
	.enter()
	.append('path')
	.attr('d', path)
	.attr('class', 'area')

	murdersMap.selectAll('.borough')
	.data(boroughs.features)
	.enter()
	.append('path')
	.attr('d', path)
	.attr('class', 'borough')


	murdersMap
	.append('path')
	.datum(boroughsMerged)
	.attr('d', path)
	.attr('class', 'outline')

	let positions = [];
	let points = [];

	murders.map(m => {

		let className = m.Method + " " + m.Victim;
		let radius = 3;

		if(m.Method == 'Shot' || m.Method == 'Stabbed')
		{
			className = m.Method + " " + m.Victim
		}
		else
		{
			className = 'other' + " " + m.Victim
		}

		if(width > 400)
		{
			if(m.Method == 'Shot') radius = 6.1325
				else radius =  6.875
			}
		else radius =  3

			positions.push({
				cx: projection([+m.long, +m.lat])[0],
				cy: projection([+m.long, +m.lat])[1],
				className: className,
				r:radius,
				name: m.Victim,
				age: m.Age,
				date: m.Date,
				street: m.Street,
				method: m.Method
				
			})

		points.push(projection([+m.long, +m.lat]))

	})

	let circles = murdersMap.selectAll("circle")
	.data(positions)
	.enter()
	.append('circle')
	.attr('cx', d => d.cx)
	.attr('cy', d => d.cy)
	.attr('class', d => d.className)
	.attr('id', (d,i) => "c"+i)
	.attr('r', d => d.r)

	const polygons = voronoi(points).polygons();

	let tooltip = d3.select(".tooltip")
	let tName = d3.select(".tooltip-name")
	let tAge = d3.select(".tooltip-age")
	let tDate= d3.select(".tooltip-date")
	let tStreet = d3.select(".tooltip-street")
	let tMethod = d3.select(".tooltip-method")

	murdersMap.selectAll(".cell")
	.data(polygons)
	.enter()
	.append("path")
	.attr("class", "cell")
	.attr("opacity", 0)
	.attr("stroke", "black")
	.attr("d", d => {return "M" + d.join("L") + "Z"})
	.on('mouseover', (d,i) => {
		d3.select('.tooltip').classed(" over", true)
		d3.select('#c' + i).classed(" over", true)
		tName.html(positions[i].name)
		tAge.html(positions[i].age + " years old")
		tDate.html(positions[i].date)
		tStreet.html(positions[i].street)
		tMethod.html(positions[i].method)
	})
	.on('mouseout', d => {
		d3.select('.tooltip').classed(" over", false)
		murdersMap.select(".over").classed(" over", false)
	})
	.on("mousemove", mousemove)

	function mousemove(event) {

	  	let marginLeft = mapEl.getBoundingClientRect().left;
	  	let marginTop = mapEl.getBoundingClientRect().top;

	    tooltip.style('left', d3.mouse(this)[0] + padding + 'px')
	    tooltip.style('top', d3.mouse(this)[1] + padding + 'px')

	    let tWidth = +tooltip.style("width").split('px')[0]
	    let tLeft = +tooltip.style("left").split('px')[0]

	    if(tLeft + tWidth > width - padding)
	    {
	    	tooltip.style('left', width - tWidth - padding + 'px')
	    }
	}

  	if(!isMobile){
		annotation.style('display', 'block')
		annotation.style('left', projection(annotationLatLong)[0] + 'px')
  		annotation.style('top', projection(annotationLatLong)[1] - annotation.node().getBoundingClientRect().height + 'px')
	}
	else
	{
		annotation.style('display', 'none')
	}
}




