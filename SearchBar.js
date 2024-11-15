import React, { useState } from 'react';

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func.apply(context, args);
        }, wait);
    };
}


export default function SearchBarWrapper(props) {

  let [searchResults, setResults] = useState([])

  function search(e) {
    if (e.target.value.length <3) return
  
    fetch('http://localhost:5000/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: e.target.value,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Success:', data);

        setResults(data)
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }
  

  return (
    <>
      <input type="text" 
      placeholder="Search" 
      onChange={debounce(search, 300)}
      onBlur={search} 
      onSubmit={search}
      style={{padding:"7px 15px", border: "2px solid #CCC", borderRadius: 5}} />

    {searchResults && searchResults.hits && searchResults.hits.length > 0 &&
        <div style={{
            background: "white",
            color: "black",
            padding: 20,
            position: "absolute"
        }}>
            {searchResults.hits.map((hit, index) => {
            return <div key={index} style={{padding:3}}><a
            style={{color: "blue", padding: 3}}
            href={"/" + hit.input.data.metadata.url}>{hit.input.data.metadata.title}</a></div>
            })}
        </div>
    }
    </>
  );
}