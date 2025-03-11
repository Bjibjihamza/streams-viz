import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import 'bootstrap/dist/css/bootstrap.min.css';


const mockCategories = [
    { category: "Just Chatting", viewers: 380000, tags: "IRL, Talk Show", image_url: "/api/placeholder/60/80" },
  ];
  
  // Mock streams data
  const mockStreams = [
    { channel: "xQc", category: "Just Chatting", title: "OPENING CASES !gamble", viewers: 87000, tags: "English" },
  ];


// Main dashboard component
const TwitchDashboard = () => {
  // States for storing data
  const [categories, setCategories] = useState([]);
  const [streams, setStreams] = useState([]);
  const [categoryHistory, setCategoryHistory] = useState([]);
  const [streamsHistory, setStreamsHistory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStreamer, setSelectedStreamer] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [viewMode, setViewMode] = useState('light');

  // API base URL - update this to match your API server
  const API_BASE_URL = 'http://localhost:8000/api';

  // Data loading from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Convert timeRange to hours for API
        const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
        
        // Fetch all data in parallel for better performance
        const [
          categoriesData, 
          streamsData, 
          historyData, 
          streamsHistoryData,
          statisticsData
        ] = await Promise.all([
          fetchWithTimeout(`${API_BASE_URL}/categories`),
          fetchWithTimeout(`${API_BASE_URL}/streams`),
          fetchWithTimeout(`${API_BASE_URL}/categories/history?hours=${hours}`),
          fetchWithTimeout(`${API_BASE_URL}/streams/history?hours=${hours}`),
          fetchWithTimeout(`${API_BASE_URL}/statistics`)
        ]);
        
        // Update state with fetched data
        setCategories(categoriesData);
        setStreams(streamsData);
        setCategoryHistory(historyData);
        setStreamsHistory(streamsHistoryData);
        setStatistics(statisticsData);
        
        // Set default selected category if not already set
        if (!selectedCategory && categoriesData.length > 0) {
            if (!selectedCategory) {
                setSelectedCategory(categoriesData[0].category);
            }
            
        }
        
        // Set default selected streamer if not already set
        if (!selectedStreamer && streamsData.length > 0) {
          setSelectedStreamer(streamsData[0].channel);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
        
        // Fallback to mock data if API fails
        loadMockData();
      }
    };
    
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    renderCategoryChart();
    renderTimeSeriesChart();
    renderStreamerChart();
}, [selectedCategory]);


  // Fetch with timeout helper function
  const fetchWithTimeout = async (url, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

  // Fallback to mock data if API fails
  const loadMockData = () => {
    console.log("Loading mock data as fallback");
    
    // Mock history data for categories
    const generateCategoryHistory = (categoryName, baseViewers) => {
      const history = [];
      const now = new Date();
      
      for (let i = 0; i < 24; i++) {
        const hourOffset = 24 - i;
        const timestamp = new Date(now);
        timestamp.setHours(now.getHours() - hourOffset);
        
        // Random variation
        const randomFactor = 0.8 + Math.random() * 0.4;
        const viewers = Math.round(baseViewers * randomFactor);
        
        history.push({
          category: categoryName,
          hour: timestamp.getHours(),
          day: timestamp.getDate(),
          month: timestamp.getMonth() + 1,
          avg_viewers: viewers,
          max_viewers: Math.round(viewers * 1.2),
          min_viewers: Math.round(viewers * 0.8),
          count: Math.round(Math.random() * 20 + 10)
        });
      }
      
      return history;
    };

    // Generate mock history for top 5 categories
    let mockCategoryHistory = [];
    mockCategories.slice(0, 5).forEach(cat => {
      mockCategoryHistory = [
        ...mockCategoryHistory,
        ...generateCategoryHistory(cat.category, cat.viewers)
      ];
    });

    // Generate mock stream history
    const generateStreamHistory = (streamerName, baseViewers) => {
      const history = [];
      const now = new Date();
      
      for (let i = 0; i < 24; i++) {
        const hourOffset = 24 - i;
        const timestamp = new Date(now);
        timestamp.setHours(now.getHours() - hourOffset);
        
        // Random variation
        const randomFactor = 0.8 + Math.random() * 0.4;
        const viewers = Math.round(baseViewers * randomFactor);
        
        history.push({
          channel: streamerName,
          hour: timestamp.getHours(),
          day: timestamp.getDate(),
          month: timestamp.getMonth() + 1,
          avg_viewers: viewers,
          max_viewers: Math.round(viewers * 1.2),
          min_viewers: Math.round(viewers * 0.8),
          count: Math.round(Math.random() * 10 + 5)
        });
      }
      
      return history;
    };

    // Generate mock history for top 5 streamers
    let mockStreamsHistory = [];
    mockStreams.slice(0, 5).forEach(stream => {
      mockStreamsHistory = [
        ...mockStreamsHistory,
        ...generateStreamHistory(stream.channel, stream.viewers)
      ];
    });

    // Mock statistics
    const mockStatistics = {
      top_categories: mockCategories.slice(0, 10),
      top_streams: mockStreams.slice(0, 10),
      total_viewers: mockCategories.reduce((sum, cat) => sum + cat.viewers, 0),
      last_update: new Date().toISOString()
    };

    setCategories(mockCategories);
    setStreams(mockStreams);
    setCategoryHistory(mockCategoryHistory);
    setStreamsHistory(mockStreamsHistory);
    setStatistics(mockStatistics);
    
    if (!selectedCategory && mockCategories.length > 0) {
      setSelectedCategory(mockCategories[0].category);
    }
    
    if (!selectedStreamer && mockStreams.length > 0) {
      setSelectedStreamer(mockStreams[0].channel);
    }
  };

  // Function to refresh data
  const refreshData = () => {
    setLoading(true);
    // Force re-fetch by triggering useEffect
    const fetchTimeRange = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    
    Promise.all([
      fetchWithTimeout(`${API_BASE_URL}/categories`),
      fetchWithTimeout(`${API_BASE_URL}/streams`),
      fetchWithTimeout(`${API_BASE_URL}/categories/history?hours=${fetchTimeRange}`),
      fetchWithTimeout(`${API_BASE_URL}/streams/history?hours=${fetchTimeRange}`),
      fetchWithTimeout(`${API_BASE_URL}/statistics`)
    ])
    .then(([categoriesData, streamsData, historyData, streamsHistoryData, statisticsData]) => {
      setCategories(categoriesData);
      setStreams(streamsData);
      setCategoryHistory(historyData);
      setStreamsHistory(streamsHistoryData);
      setStatistics(statisticsData);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh data. Using last known data.");
      setLoading(false);
    });
  };




  // References for D3 charts
  const categoryChartRef = useRef(null);
  const timeSeriesChartRef = useRef(null);
  const streamerChartRef = useRef(null);

  // Render D3 charts after data loading
  useEffect(() => {
    if (loading) return;
    
    // Main charts
    renderCategoryChart();
    renderTimeSeriesChart();
    renderStreamerChart();
    
  }, [
    categories, 
    streams, 
    categoryHistory, 
    streamsHistory, 
    loading, 
    selectedCategory, 
    selectedStreamer, 
    activeTab,
    viewMode
  ]);

  // Get color theme based on view mode
  const getThemeColors = () => {
    return viewMode === 'dark' ? {
      background: '#1f1f1f',
      text: '#e0e0e0',
      axis: '#888',
      grid: '#333',
      primary: '#9146ff',
      secondary: '#7952b3',
      accent: '#38a3a5',
      cardBg: '#2d2d2d',
      gradientStart: 'rgba(145, 70, 255, 0.8)',
      gradientEnd: 'rgba(145, 70, 255, 0.2)'
    } : {
      background: '#f8f9fa',
      text: '#333',
      axis: '#666',
      grid: '#eee',
      primary: '#9146ff',
      secondary: '#7952b3',
      accent: '#38a3a5',
      cardBg: '#ffffff',
      gradientStart: 'rgba(145, 70, 255, 0.8)',
      gradientEnd: 'rgba(145, 70, 255, 0.2)'
    };
  };

  const themeColors = getThemeColors();

  // Main categories chart
  const renderCategoryChart = () => {
    if (!categoryChartRef.current || categories.length === 0) return;
    
    const container = categoryChartRef.current;
    const containerWidth = container.clientWidth;
    
    const margin = { top: 20, right: 30, bottom: 90, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Clear previous content
    d3.select(container).selectAll("*").remove();
    








    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // X and Y scales
    const x = d3.scaleBand()
      .domain(categories.slice(0, 10).map(d => d.category))
      .range([0, width])
      .padding(0.2);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(categories, d => d.viewers) * 1.1])
      .range([height, 0]);
    


    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("stroke", themeColors.grid)
      .style("stroke-opacity", 0.3);
    


    // Bars
    svg.selectAll("rect")
      .data(categories.slice(0, 10))
      .enter()
      .append("rect")
      .attr("x", d => x(d.category))
      .attr("y", d => y(d.viewers))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.viewers))
      .attr("fill", d => d.category === selectedCategory ? themeColors.primary : themeColors.secondary)
      .attr("opacity", d => d.category === selectedCategory ? 1 : 0.7)
      .attr("rx", 4)  // Rounded corners
      .on("click", (event, d) => {
        if (selectedCategory !== d.category) {
            setSelectedCategory(d.category);
        }
    })
    
      .on("mouseover", function() {
        d3.select(this).attr("opacity", 0.9).attr("stroke", themeColors.accent).attr("stroke-width", 2);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("opacity", d.category === selectedCategory ? 1 : 0.7)
          .attr("stroke", "none");
      });
    

      
    // Add values on top of bars
    svg.selectAll(".bar-label")
      .data(categories.slice(0, 10))
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.category) + x.bandwidth() / 2)
      .attr("y", d => y(d.viewers) - 5)
      .attr("text-anchor", "middle")
      .text(d => d3.format(".2s")(d.viewers))
      .attr("font-size", 10)
      .attr("fill", themeColors.text);
    
    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .attr("font-size", 10)
      .attr("fill", themeColors.text);
    
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(".2s")(d)))
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", themeColors.text);
    
    // Y-axis title
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 0)
      .attr("x", -(height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", themeColors.text)
      .text("Number of viewers");
    
    // Chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", themeColors.text)
      .text("Top 10 Categories by Viewers");
  };





  // Time series chart
  const renderTimeSeriesChart = () => {
    if (!timeSeriesChartRef.current || !selectedCategory) return;
    
    // Process category history data for the selected category
    const processHistoryData = () => {
      // If we have real history data from the API
      if (categoryHistory.length > 0) {
        const categoryData = categoryHistory.filter(item => 
          item.category === selectedCategory
        );
        
        if (categoryData.length > 0) {
          return categoryData.map(item => {
            // Construct date from history data components
            const date = new Date();
            date.setMonth(item.month - 1);
            date.setDate(item.day);
            date.setHours(item.hour);
            
            return {
              date: date,
              viewers: item.avg_viewers,
              min_viewers: item.min_viewers,
              max_viewers: item.max_viewers
            };
          }).sort((a, b) => a.date - b.date);
        }
      }
      
      // Fallback: generate mock time series data
      const selectedCategoryData = categories.find(c => c.category === selectedCategory);
      if (!selectedCategoryData) return [];
      
      const baseViewers = selectedCategoryData.viewers;
      const data = [];
      const now = new Date();
      
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now);
        timestamp.setHours(now.getHours() - (24 - i));
        
        // Add random variation
        const randomFactor = 0.8 + Math.random() * 0.4; // Between 0.8 and 1.2
        const viewers = Math.round(baseViewers * randomFactor);
        
        data.push({
          date: timestamp,
          viewers,
          min_viewers: Math.round(viewers * 0.9),
          max_viewers: Math.round(viewers * 1.1)
        });
      }
      
      return data;
    };
    
    const timeData = processHistoryData();
    const container = timeSeriesChartRef.current;
    
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Clear previous content
    d3.select(container).selectAll("*").remove();
    
    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // X and Y scales
    const x = d3.scaleTime()
      .domain(d3.extent(timeData, d => d.date))
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(timeData, d => d.max_viewers || d.viewers) * 1.1])
      .range([height, 0]);
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("stroke", themeColors.grid)
      .style("stroke-opacity", 0.3);
    
    // Add min-max area if we have the data
    if (timeData[0].min_viewers && timeData[0].max_viewers) {
      // Define area between min and max
      const minMaxArea = d3.area()
        .x(d => x(d.date))
        .y0(d => y(d.min_viewers))
        .y1(d => y(d.max_viewers))
        .curve(d3.curveMonotoneX);
      
      svg.append("path")
        .datum(timeData)
        .attr("fill", themeColors.secondary)
        .attr("fill-opacity", 0.2)
        .attr("d", minMaxArea);
    }
    
    // Line
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.viewers))
      .curve(d3.curveMonotoneX);
    
    // Add gradient for area under the curve
    const areaGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "areaGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
      
    areaGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", themeColors.primary)
      .attr("stop-opacity", 0.8);
      
    areaGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", themeColors.primary)
      .attr("stop-opacity", 0.2);
    
    // Define and draw area
    const area = d3.area()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.viewers))
      .curve(d3.curveMonotoneX);
    
    svg.append("path")
      .datum(timeData)
      .attr("fill", "url(#areaGradient)")
      .attr("d", area);
    
    // Draw line
    svg.append("path")
      .datum(timeData)
      .attr("fill", "none")
      .attr("stroke", themeColors.primary)
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add points for each measure
    svg.selectAll(".dot")
      .data(timeData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.viewers))
      .attr("r", 4)
      .attr("fill", themeColors.primary)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 6)
          .attr("stroke", themeColors.text)
          .attr("stroke-width", 2);
        
        // Create tooltip
        const tooltip = svg.append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${x(d.date)},${y(d.viewers) - 15})`);
        
        tooltip.append("rect")
          .attr("x", -60)
          .attr("y", -30)
          .attr("width", 120)
          .attr("height", 30)
          .attr("fill", themeColors.cardBg)
          .attr("stroke", themeColors.text)
          .attr("stroke-width", 1)
          .attr("rx", 5);
        
        tooltip.append("text")
          .attr("x", 0)
          .attr("y", -10)
          .attr("text-anchor", "middle")
          .attr("fill", themeColors.text)
          .text(`${d3.format(",")(d.viewers)} viewers`);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 4)
          .attr("stroke", "none");
        
        svg.select(".tooltip").remove();
      });
    
    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%H:%M")))
      .selectAll("text")
      .attr("fill", themeColors.text);
    
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(".2s")(d)))
      .selectAll("text")
      .attr("fill", themeColors.text);
    
    // Chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("fill", themeColors.text)
      .text(`Viewer evolution - ${selectedCategory}`);
    
    // Y-axis title
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -(height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", themeColors.text)
      .text("Viewers");
    
    // X-axis title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .style("fill", themeColors.text)
      .text("Hour");
  };

  // Top streamers chart
  const renderStreamerChart = () => {
    if (!streamerChartRef.current) return;
    
    // Filter streams by selected category
    const filteredStreams = selectedCategory 
      ? streams.filter(s => s.category === selectedCategory)
      : streams;
    
    const sortedStreams = filteredStreams.sort((a, b) => b.viewers - a.viewers).slice(0, 5);
    const container = streamerChartRef.current;
    
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Clear previous content
    d3.select(container).selectAll("*").remove();
    
    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // X and Y scales
    const x = d3.scaleBand()
      .domain(sortedStreams.map(d => d.channel))
      .range([0, width])
      .padding(0.3);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(sortedStreams, d => d.viewers) * 1.1])
      .range([height, 0]);
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("stroke", themeColors.grid)
      .style("stroke-opacity", 0.3);
    
    // Function to generate different colors
    const colorScale = d3.scaleOrdinal()
      .domain(sortedStreams.map(d => d.channel))
      .range([themeColors.primary, "#9d86d9", "#b9a3e3", "#d3c7eb", themeColors.accent]);
    
    // Bars
    svg.selectAll("rect")
      .data(sortedStreams)
      .enter()
      .append("rect")
      .attr("x", d => x(d.channel))
      .attr("y", d => y(d.viewers))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.viewers))
      .attr("fill", d => d.channel === selectedStreamer ? themeColors.primary : colorScale(d.channel))
      .attr("opacity", d => d.channel === selectedStreamer ? 1 : 0.7)
      .attr("rx", 4)  // Rounded corners
      .on("click", (event, d) => {
        setSelectedStreamer(d.channel);
      })
      .on("mouseover", function() {
        d3.select(this).attr("opacity", 0.9).attr("stroke", themeColors.accent).attr("stroke-width", 2);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("opacity", d.channel === selectedStreamer ? 1 : 0.7)
          .attr("stroke", "none");
      });
    
    // Add values on top of bars
    svg.selectAll(".bar-label")
      .data(sortedStreams)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.channel) + x.bandwidth() / 2)
      .attr("y", d => y(d.viewers) - 5)
      .attr("text-anchor", "middle")
      .text(d => d3.format(",")(d.viewers))
      .attr("font-size", 10)
      .attr("fill", themeColors.text);
    
    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", themeColors.text);
    
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(",")(d)))
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", themeColors.text);
    
    // Y-axis title
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left )
      .attr("x", -(height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", themeColors.text)
      .text("Viewers");
    
    // Chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", themeColors.text)
      .text(`Top Streamers${selectedCategory ? ` - ${selectedCategory}` : ''}`);
  };


  // Render main dashboard UI
return (
  <div className={`container-fluid p-0 ${viewMode === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}`} 
       style={{ 
         background: themeColors.background, 
         color: themeColors.text,
         minHeight: '100vh'
       }}>
    {/* Header */}
    <div className="row g-0">
      <div className="col">
        <div className={`d-flex justify-content-between align-items-center p-3 shadow-sm mb-4 ${viewMode === 'dark' ? 'bg-dark-subtle' : 'bg-light-subtle'}`} 
             style={{ background: themeColors.cardBg }}>
          <h1 className="d-flex align-items-center m-0">
            <i className="bi bi-twitch text-primary me-3 fs-2"></i> 
            Twitch Analytics Dashboard
          </h1>
          <div className="d-flex align-items-center">
            <button className="btn btn-outline-primary me-3" onClick={refreshData}>
              <i className="bi bi-arrow-repeat me-2"></i> Refresh
            </button>
            
            <div className="dropdown me-3">
              <button className="btn btn-outline-primary dropdown-toggle" 
                      type="button" 
                      id="timeRangeDropdown" 
                      data-bs-toggle="dropdown" 
                      aria-expanded="false">
                <i className="bi bi-clock-history me-2"></i> 
                {timeRange === '24h' ? 'Last 24 Hours' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
              <ul className="dropdown-menu shadow" aria-labelledby="timeRangeDropdown">
                <li><button className="dropdown-item" onClick={() => setTimeRange('24h')}>Last 24 Hours</button></li>
                <li><button className="dropdown-item" onClick={() => setTimeRange('7d')}>Last 7 Days</button></li>
                <li><button className="dropdown-item" onClick={() => setTimeRange('30d')}>Last 30 Days</button></li>
              </ul>
            </div>
            
            <div className="form-check form-switch d-flex align-items-center">
              <input
                className="form-check-input me-2"
                type="checkbox"
                id="darkModeSwitch"
                checked={viewMode === 'dark'}
                onChange={() => setViewMode(viewMode === 'dark' ? 'light' : 'dark')}
              />
              <label className="form-check-label" htmlFor="darkModeSwitch">
                <i className={`bi ${viewMode === 'dark' ? 'bi-moon-fill' : 'bi-sun-fill'}`}></i>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="container-fluid px-4">
      {/* Error Alert */}
      {error && (
        <div className="row mb-4">
          <div className="col">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-4"></i>
              <div>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading ? (
        <div className="row justify-content-center my-5 py-5">
          <div className="col-auto text-center">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="row mb-4 g-3">
            <div className="col-md-4">
              <div className={`card h-100 shadow-sm border-0 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                   style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="rounded-circle p-2 me-3" style={{ background: 'rgba(13, 110, 253, 0.2)' }}>
                      <i className="bi bi-people-fill text-primary fs-4"></i>
                    </div>
                    <h5 className="card-title m-0">Total Viewers</h5>
                  </div>
                  <h2 className="mb-2 fw-bold">{d3.format(",")(statistics?.total_viewers || 0)}</h2>
                  <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                    <div className="progress-bar " style={{ width: '100%' ,  background: 'rgb(145, 70, 255)'  }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className={`card h-100 shadow-sm border-0 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                   style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="rounded-circle p-2 me-3" style={{ background: 'rgba(13, 110, 253, 0.2)' }}>
                      <i className="bi bi-tags-fill text-primary fs-4"></i>
                    </div>
                    <h5 className="card-title m-0">Top Categories</h5>
                  </div>
                  <h2 className="mb-2 fw-bold">{categories.length}</h2>
                  <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                    <div className="progress-bar " style={{ width: '100%' ,  background: 'rgb(145, 70, 255)' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className={`card h-100 shadow-sm border-0 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                   style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="rounded-circle p-2 me-3" style={{ background: 'rgba(13, 110, 253, 0.2)' }}>
                      <i className="bi bi-broadcast text-primary fs-4"></i>
                    </div>
                    <h5 className="card-title m-0">Active Streams</h5>
                  </div>
                  <h2 className="mb-2 fw-bold">{streams.length}</h2>
                  <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                    <div className="progress-bar" style={{ width: '100%' ,  background: 'rgb(145, 70, 255)' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

              <div className="row mb-4 g-4">
                <div className="col-md-8">
                  <div className={`card shadow-sm border-0 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                       style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                    <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center p-4">
                      <h5 className="m-0 fw-bold">Top Categories by Viewers</h5>
                      <button 
                        className="btn btn-sm btn-outline-primary" 
                        onClick={() => setShowDataTable(!showDataTable)}
                      >
                        <i className={`bi ${showDataTable ? 'bi-bar-chart' : 'bi-table'} me-2`}></i>
                        {showDataTable ? 'Show Chart' : 'Show Table'}
                      </button>
                    </div>
                    <div className="card-body p-4">
                      {showDataTable ? (
                        <div className="table-responsive" style={{ maxHeight: '320px' }}>
                          <table className={`table table-hover ${viewMode === 'dark' ? 'table-dark' : ''}`}>
                            <thead>
                              <tr>
                                <th className="fw-bold">Rank</th>
                                <th className="fw-bold">Category</th>
                                <th className="text-end fw-bold">Viewers</th>
                                <th className="text-end fw-bold">Streams</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categories.slice(0, 10).map((cat, index) => (
                                <tr 
                                  key={cat.category} 
                                  className={`${cat.category === selectedCategory ? 'table-primary' : ''} cursor-pointer`} 
                                  onClick={() => {
                                    if (selectedCategory !== cat.category) {
                                        setSelectedCategory(cat.category);
                                    }
                                }}
                                
                                >
                                  <td>{index + 1}</td>
                                  <td>{cat.category}</td>
                                  <td className="text-end">{d3.format(",")(cat.viewers)}</td>
                                  <td className="text-end">{cat.streams}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div ref={categoryChartRef} style={{ height: '320px' }}></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className={`card shadow-sm border-0 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                       style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                    <div className="card-header bg-transparent border-0 p-4">
                      <h5 className="m-0 fw-bold">Top Streamers</h5>
                    </div>
                    <div className="card-body p-4">
                      <div ref={streamerChartRef} style={{ height: '320px' }}></div>
                    </div>
                  </div>
                </div>



              </div>

              <div className="row mb-4">
                <div className="col-md-10">
                  <div className={`card shadow-sm border-0 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                       style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                    <div className="card-header bg-transparent border-0 p-4">
                      <h5 className="m-0 fw-bold">Viewer Evolution</h5>
                    </div>
                    <div className="card-body p-4">
                      <div ref={timeSeriesChartRef} style={{ height: '320px' }}></div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className={`card shadow-sm border-0 h-100 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                       style={{ background: themeColors.cardBg, borderRadius: '0.75rem' }}>
                    <div className="card-header bg-transparent border-0 p-4">
                      <h5 className="m-0 fw-bold">Latest Updates</h5>
                    </div>
                    <div className="card-body p-0">
                      <ul className="list-group list-group-flush rounded-bottom">
                        {statistics && (
                          <li className={`list-group-item border-0 py-3 px-4 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                              style={{ background: themeColors.cardBg }}>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Last update</span>
                              <span className="fw-medium">{new Date(statistics.last_update).toLocaleString()}</span>
                            </div>
                          </li>
                        )}
                        <li className={`list-group-item border-0 py-3 px-4 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                            style={{ background: themeColors.cardBg }}>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Top category</span>
                            <span className="fw-medium">{categories.length > 0 ? categories[0].category : 'N/A'}</span>
                          </div>
                        </li>
                        <li className={`list-group-item border-0 py-3 px-4 ${viewMode === 'dark' ? 'bg-dark-subtle text-light' : ''}`} 
                            style={{ background: themeColors.cardBg }}>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Top streamer</span>
                            <span className="fw-medium">{streams.length > 0 ? streams[0].channel : 'N/A'}</span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

      <div className="row mt-5">
        <div className="col">
          <div className={`text-center py-4 ${viewMode === 'dark' ? 'text-light-50' : 'text-secondary'}`}>
            <p className="mb-0">© 2025 Twitch Analytics Dashboard - Real-time streaming data visualizations</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);


}

export default TwitchDashboard;