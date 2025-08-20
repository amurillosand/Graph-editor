import React from "react";
import Node from "./Node";
import { Edge, Loop } from "./Edge";
import { getRandom } from "./Stuff";
import { prettyTree, getComponentFrom } from "./PrettyTree";

import "./styles.css"

class Canvas extends React.Component {
  constructor(props) {
    super(props);

    const defaultCamera = {
      viewX: -500,
      viewY: -500,
      viewW: 2000,
      viewH: 2000,
    };

    this.defaultCamera = defaultCamera;

    this.state = {
      nodesInfo: [],
      printableNodes: [],
      deltaX: 0,
      deltaY: 0,
      movedNodeId: null,

      ...defaultCamera,
      isPanning: false,
      lastMouse: null,
    };
  }

  updatePosition = (id, x, y) => {
    let deltaX = 0;
    let deltaY = 0;
    const nodesInfo = this.state.nodesInfo.map((node) => {
      if (node.id === id) {
        deltaX = x - node.x;
        deltaY = y - node.y;
        if (!this.props.drag) {
          node.x = x;
          node.y = y;
        }
      }
      return node;
    });

    this.setState({
      nodesInfo: nodesInfo,
      deltaX: deltaX,
      deltaY: deltaY,
      movedNodeId: id,
    });
  }

  componentDidUpdate(prevProps, prevState) {
    let component = null;
    if (this.state.movedNodeId !== null && this.props.drag) {
      if (this.state.deltaX !== prevState.deltaX || this.state.deltaY !== prevState.deltaY) {
        component = getComponentFrom(this.state.movedNodeId, this.state.nodesInfo, this.props.edges);
      }
    }

    if (this.props !== prevProps || component !== null) {
      let nodesInfo = []
      for (const [curNode, info] of this.props.nodes) {
        let prevNode = prevState.nodesInfo.find(node => {
          return node.id === curNode;
        });

        if (prevNode !== undefined) {
          prevNode.color = info.color;
          prevNode.label = info.label;
          nodesInfo.push(prevNode);
        } else {
          nodesInfo.push({
            id: curNode,
            x: getRandom(-500, 500),
            y: getRandom(-500, 500),
            color: info.color,
            label: info.label,
          });
        }
      }

      if (component !== null) {
        nodesInfo = nodesInfo.map((node) => {
          if (component.has(node.id)) {
            node.x = node.x + this.state.deltaX;
            node.y = node.y + this.state.deltaY;
          }
          return node;
        })
      }

      prettyTree({
        drawGraph: this.props.drawGraph,
        likeTree: this.props.likeTree,
        nodes: nodesInfo,
        edges: this.props.edges
      }, () => {
        let printableNodes = nodesInfo.map((node) => {
          return (
            <Node
              key={node.id}
              id={node.id}
              x={node.x} y={node.y}
              color={node.color}
              label={node.label}
              updatePosition={this.updatePosition} />
          );
        });

        this.setState({
          nodesInfo: nodesInfo,
          printableNodes: printableNodes
        });
      });
    }
  }

  // ===== Camera controls =====

  startPan = (e) => {
    if (e.target.tagName === "svg") {
      this.setState({ isPanning: true, lastMouse: { x: e.clientX, y: e.clientY } });
    }
  }

  doPan = (e) => {
    if (!this.state.isPanning) return;

    const dx = e.clientX - this.state.lastMouse.x;
    const dy = e.clientY - this.state.lastMouse.y;

    this.setState((prev) => ({
      viewX: prev.viewX - dx,
      viewY: prev.viewY - dy,
      lastMouse: { x: e.clientX, y: e.clientY }
    }));
  }

  endPan = () => {
    this.setState({ isPanning: false });
  }

  handleWheel = (e) => {
    e.preventDefault();

    const zoomFactor = 1.1;
    const { viewX, viewY, viewW, viewH } = this.state;

    let newW = e.deltaY < 0 ? viewW / zoomFactor : viewW * zoomFactor;
    let newH = e.deltaY < 0 ? viewH / zoomFactor : viewH * zoomFactor;

    this.setState({
      viewX: viewX + (viewW - newW) / 2,
      viewY: viewY + (viewH - newH) / 2,
      viewW: newW,
      viewH: newH,
    });
  }

  // ===== Reset / Center view =====
  resetView = () => {
    if (this.state.nodesInfo.length === 0) {
      this.setState({ ...this.defaultCamera });
      return;
    }

    const minX = Math.min(...this.state.nodesInfo.map(n => n.x));
    const maxX = Math.max(...this.state.nodesInfo.map(n => n.x));
    const minY = Math.min(...this.state.nodesInfo.map(n => n.y));
    const maxY = Math.max(...this.state.nodesInfo.map(n => n.y));

    const padding = 100;
    const viewW = (maxX - minX) + padding;
    const viewH = (maxY - minY) + padding;
    const viewX = minX - padding / 2;
    const viewY = minY - padding / 2;

    this.setState({ viewX, viewY, viewW, viewH });
  }

  render() {
    let lastKey = new Map();
    let previousKey = "";
    let rank = 0;

    function getKey(from, to) {
      if (from > to) {
        [from, to] = [to, from]
      }
      return JSON.stringify({ from, to });
    }

    function leftSide(pointA, pointB) {
      if (pointA.x === pointB.x) {
        return pointA.y < pointB.y;
      }
      return pointA.x < pointB.x;
    }

    const printableNodes = this.state.nodesInfo.map((node) => (
      <Node
        key={node.id}
        id={node.id}
        x={node.x}
        y={node.y}
        color={node.color}
        label={node.label}
        updatePosition={this.updatePosition}
      />
    ));

    return (
      <div
        className="scrollable-image"
        onMouseDown={this.startPan}
        onMouseMove={this.doPan}
        onMouseUp={this.endPan}
        onWheel={this.handleWheel}
      >
        <svg
          className="image"
          viewBox={`${this.state.viewX} ${this.state.viewY} ${this.state.viewW} ${this.state.viewH}`}
        >
          {
            this.props.edges.sort((a, b) => {
              return getKey(a[0].from, a[0].to) < getKey(b[0].from, b[0].to) ? -1 : +1;
            }).map((edge) => {
              let currentKey = getKey(edge[0].from, edge[0].to);

              if (previousKey === currentKey) {
                rank++;
              } else {
                rank = 0;
              }

              lastKey.set(currentKey, rank);
              previousKey = currentKey;

              return ([
                ...edge,
                rank
              ]);
            }).map((edge) => {
              const from = this.state.nodesInfo.find(node => {
                return edge[0].from === node.id;
              });
              const to = this.state.nodesInfo.find(node => {
                return edge[0].to === node.id;
              });

              const currentKey = getKey(edge[0].from, edge[0].to);
              let rank = edge[2] - Math.ceil(lastKey.get(currentKey) / 2);

              if (edge[0].from > edge[0].to) {
                rank *= -1;
                if (from !== undefined && to !== undefined && !leftSide(to, from)) {
                  rank *= -1;
                }
              } else {
                if (from !== undefined && to !== undefined && !leftSide(from, to)) {
                  rank *= -1;
                }
              }

              return ({
                from: from,
                to: to,
                weight: edge[1].weight,
                color: edge[1].color,
                dashedLine: edge[1].dashedLine,
                delta: -40 * rank,
              })
            }).map((edge, key) => {
              if (edge.from === edge.to) {
                return (
                  <Loop
                    key={key}
                    from={edge.from}
                    to={edge.to}
                    weight={edge.weight}
                    color={edge.color}
                    directed={this.props.directed} />
                );
              } else {
                return (
                  <Edge
                    delta={edge.delta}
                    key={key}
                    from={edge.from}
                    to={edge.to}
                    weight={edge.weight}
                    color={edge.color}
                    dashedLine={edge.dashedLine}
                    directed={this.props.directed} />
                );
              }
            })
          }
          {printableNodes}
        </svg>
      </div>
    );
  }
}

export default Canvas;
