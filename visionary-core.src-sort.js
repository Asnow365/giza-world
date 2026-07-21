import { r as B } from "./visionary-core.src-shaders.js";
const _ = 256, h = 8, f = 1 << h, y = 32 / h, d = 15, S = d, U = 128, P = 256;
function R(m) {
  const e = m.slice();
  for (let r = e.length - 1; r > 0; r--) {
    const t = Math.floor(Math.random() * (r + 1));
    [e[r], e[t]] = [e[t], e[r]];
  }
  return e;
}
class g {
  bindGroupLayout;
  renderBindGroupLayout;
  preprocessBindGroupLayout;
  zero_p;
  histogram_p;
  prefix_p;
  // 3-phase scatter pipelines
  scatter_local_even_p;
  scatter_local_odd_p;
  scatter_prefix_p;
  scatter_apply_even_p;
  scatter_apply_odd_p;
  subgroupSize;
  constructor() {
  }
  /**
   * Asynchronously creates and initializes a new GPURSSorter.
   */
  static async create(e, r) {
    console.debug("Searching for the maximum subgroup size...");
    const t = [16, 32, 16, 8, 1];
    for (const a of t) {
      console.debug(`Testing sorting with subgroup size ${a}`);
      try {
        const s = new g();
        if (await s.initializeWithSubgroupSize(e, a), await s.testSort(e, r))
          return console.log(`Subgroup size ${a} works.`), s;
      } catch (s) {
        console.warn(`Subgroup size ${a} failed during pipeline creation or test run.`, s);
      }
    }
    throw new Error("GPURSSorter::create() No working subgroup size was found. Unable to use sorter.");
  }
  /**
   * Initializes the sorter's pipelines and layouts for a given subgroup size.
   */
  async initializeWithSubgroupSize(e, r) {
    this.subgroupSize = r, this.bindGroupLayout = this.createBindGroupLayout(e), this.renderBindGroupLayout = g.createRenderBindGroupLayout(e), this.preprocessBindGroupLayout = g.createPreprocessBindGroupLayout(e);
    const t = e.createPipelineLayout({
      label: "radix sort pipeline layout",
      bindGroupLayouts: [this.bindGroupLayout]
    }), a = this.processShaderTemplate(B), s = e.createShaderModule({
      label: "Radix sort shader",
      code: a
    });
    this.zero_p = await e.createComputePipelineAsync({
      label: "Zero the histograms",
      layout: t,
      compute: { module: s, entryPoint: "zero_histograms" }
    }), this.histogram_p = await e.createComputePipelineAsync({
      label: "calculate_histogram",
      layout: t,
      compute: { module: s, entryPoint: "calculate_histogram" }
    }), this.prefix_p = await e.createComputePipelineAsync({
      label: "prefix_histogram",
      layout: t,
      compute: { module: s, entryPoint: "prefix_histogram" }
    }), this.scatter_local_even_p = await e.createComputePipelineAsync({
      label: "scatter_local_even",
      layout: t,
      compute: { module: s, entryPoint: "scatter_local_even" }
    }), this.scatter_local_odd_p = await e.createComputePipelineAsync({
      label: "scatter_local_odd",
      layout: t,
      compute: { module: s, entryPoint: "scatter_local_odd" }
    }), this.scatter_prefix_p = await e.createComputePipelineAsync({
      label: "scatter_prefix_pass",
      layout: t,
      compute: { module: s, entryPoint: "scatter_prefix_pass" }
    }), this.scatter_apply_even_p = await e.createComputePipelineAsync({
      label: "scatter_apply_even",
      layout: t,
      compute: { module: s, entryPoint: "scatter_apply_even" }
    }), this.scatter_apply_odd_p = await e.createComputePipelineAsync({
      label: "scatter_apply_odd",
      layout: t,
      compute: { module: s, entryPoint: "scatter_apply_odd" }
    });
  }
  processShaderTemplate(e) {
    const r = Math.max(1, this.subgroupSize | 0), t = Math.floor(f / r), a = Math.floor(t / r), c = f + S * P, n = 0, o = n + t, i = o + a, u = `const histogram_sg_size: u32 = ${r}u;
            const histogram_wg_size: u32 = ${_}u;
            const rs_radix_log2: u32 = ${h}u;
            const rs_radix_size: u32 = ${f}u;
            const rs_keyval_size: u32 = ${y}u;
            const rs_histogram_block_rows: u32 = ${d}u;
            const rs_scatter_block_rows: u32 = ${S}u;
            const rs_mem_dwords: u32 = ${c}u;
            const rs_mem_sweep_0_offset: u32 = ${n}u;
            const rs_mem_sweep_1_offset: u32 = ${o}u;
            const rs_mem_sweep_2_offset: u32 = ${i}u;
            `;
    let p = e.replace(/{histogram_wg_size}/g, _.toString()).replace(/{prefix_wg_size}/g, U.toString()).replace(/{scatter_wg_size}/g, P.toString());
    return u + p;
  }
  /**
   * Runs a small test sort to verify the current configuration works.
   */
  async testSort(e, r) {
    const a = new Float32Array(
      R(Array.from({ length: 8192 }, (i, u) => 8191 - u))
    ), s = new Float32Array(
      Array.from({ length: 8192 }, (i, u) => u)
    ), c = this.createSortStuff(e, 8192);
    r.writeBuffer(c.key_a, 0, a.buffer);
    const n = e.createCommandEncoder({ label: "GPURSSorter test_sort" });
    this.recordSort(c, 8192, n), r.submit([n.finish()]), await e.queue.onSubmittedWorkDone();
    const o = await this.downloadBuffer(e, r, c.key_a, "f32");
    for (let i = 0; i < 8192; i++)
      if (o[i] !== s[i])
        return console.error(`Sort failed at index ${i}. Expected ${s[i]}, got ${o[i]}`), !1;
    return !0;
  }
  /**
   * Creates all the necessary buffers and bind groups for sorting a given number of points.
   */
  createSortStuff(e, r) {
    const { key_a: t, key_b: a, payload_a: s, payload_b: c } = this.createKeyvalBuffers(e, r, 4), n = this.createInternalMemBuffer(e, r), { sorter_uni: o, sorter_dis: i, sorter_bg: u } = this.createBindGroup(
      e,
      r,
      n,
      t,
      a,
      s,
      c
    ), p = this.createRenderBindGroup(e, o, s), l = this.createPreprocessBindGroup(e, o, i, t, s);
    return {
      numPoints: r,
      num_points: r,
      sortedIndices: s,
      indirectBuffer: i,
      sorter_uni: o,
      sorter_dis: i,
      sorter_bg: u,
      sorter_render_bg: p,
      sorter_bg_pre: l,
      internal_mem: n,
      key_a: t,
      key_b: a,
      payload_a: s,
      payload_b: c
    };
  }
  /**
   * Records sort commands using direct dispatch (known key count).
   * Each radix pass is: scatter_local -> scatter_prefix -> scatter_apply (3 separate compute passes)
   */
  recordSort(e, r, t) {
    const a = e;
    this.recordCalculateHistogram(a.sorter_bg, r, t), this.recordPrefixHistogram(a.sorter_bg, 4, t), this.recordScatterKeys(a.sorter_bg, r, t);
  }
  /**
   * Records sort commands using indirect dispatch (GPU-determined key count).
   * Same 3-phase scatter approach, using dispatchWorkgroupsIndirect.
   */
  recordSortIndirect(e, r, t) {
    const a = e;
    {
      const s = t.beginComputePass({ label: "RS::Zero (Indirect)" });
      s.setBindGroup(0, a.sorter_bg), s.setPipeline(this.zero_p), s.dispatchWorkgroupsIndirect(r, 0), s.end();
    }
    {
      const s = t.beginComputePass({ label: "RS::Histogram (Indirect)" });
      s.setBindGroup(0, a.sorter_bg), s.setPipeline(this.histogram_p), s.dispatchWorkgroupsIndirect(r, 0), s.end();
    }
    this.recordPrefixHistogram(a.sorter_bg, 4, t), this.recordScatterPassIndirect(a.sorter_bg, r, !0, t), this.recordScatterPassIndirect(a.sorter_bg, r, !1, t), this.recordScatterPassIndirect(a.sorter_bg, r, !0, t), this.recordScatterPassIndirect(a.sorter_bg, r, !1, t);
  }
  recordSortIndirect_one(e, r, t) {
    this.recordSortIndirect(e, r, t);
  }
  // Static methods for bind group layouts
  static createRenderBindGroupLayout(e) {
    return e.createBindGroupLayout({
      label: "Radix Sort Render Bind Group Layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }
      ]
    });
  }
  static createPreprocessBindGroupLayout(e) {
    return e.createBindGroupLayout({
      label: "Radix Sort Preprocess Bind Group Layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
      ]
    });
  }
  recordResetIndirectBuffer(e, r, t) {
    const a = new Uint32Array([0]);
    t.writeBuffer(e, 0, a), t.writeBuffer(r, 0, a);
  }
  // Private implementation methods
  createBindGroupLayout(e) {
    return e.createBindGroupLayout({
      label: "Radix Sort Bind Group Layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
      ]
    });
  }
  getScatterHistogramSizes(e) {
    const r = _ * S, t = Math.ceil(e / r), a = t * r, s = _ * d, n = Math.ceil(a / s) * s;
    return { scatter_blocks_ru: t, count_ru_histo: n };
  }
  createKeyvalBuffers(e, r, t) {
    const a = _ * d, c = (Math.floor((r + a) / a) + 1) * a * Float32Array.BYTES_PER_ELEMENT, n = e.createBuffer({
      label: "Radix data buffer a",
      size: c,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    }), o = e.createBuffer({
      label: "Radix data buffer b",
      size: c,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    t !== 4 && console.warn("Currently only 4-byte payloads are fully supported.");
    const i = Math.max(1, r * t), u = e.createBuffer({
      label: "Radix payload buffer a",
      size: i,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    }), p = e.createBuffer({
      label: "Radix payload buffer b",
      size: i,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    return { key_a: n, key_b: o, payload_a: u, payload_b: p };
  }
  createInternalMemBuffer(e, r) {
    const { scatter_blocks_ru: t } = this.getScatterHistogramSizes(r), a = f * Uint32Array.BYTES_PER_ELEMENT, s = (y + (t + 1) * 2) * a;
    return e.createBuffer({
      label: "Internal radix sort buffer",
      size: s,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
  }
  createBindGroup(e, r, t, a, s, c, n) {
    const { scatter_blocks_ru: o, count_ru_histo: i } = this.getScatterHistogramSizes(r), u = {
      keys_size: r,
      padded_size: i,
      passes: 4,
      even_pass: 0,
      odd_pass: 0
    }, p = e.createBuffer({
      label: "Radix uniform buffer",
      size: 5 * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: !0
    });
    new Uint32Array(p.getMappedRange()).set([
      u.keys_size,
      u.padded_size,
      u.passes,
      u.even_pass,
      u.odd_pass
    ]), p.unmap();
    const l = {
      dispatch_x: o,
      dispatch_y: 1,
      dispatch_z: 1
    }, b = e.createBuffer({
      label: "Dispatch indirect buffer",
      size: 3 * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT,
      mappedAtCreation: !0
    });
    new Uint32Array(b.getMappedRange()).set([
      l.dispatch_x,
      l.dispatch_y,
      l.dispatch_z
    ]), b.unmap();
    const G = e.createBindGroup({
      label: "Radix bind group",
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: p } },
        { binding: 1, resource: { buffer: t } },
        { binding: 2, resource: { buffer: a } },
        { binding: 3, resource: { buffer: s } },
        { binding: 4, resource: { buffer: c } },
        { binding: 5, resource: { buffer: n } }
      ]
    });
    return { sorter_uni: p, sorter_dis: b, sorter_bg: G };
  }
  createRenderBindGroup(e, r, t) {
    return e.createBindGroup({
      label: "Render bind group",
      layout: this.renderBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: r } },
        { binding: 4, resource: { buffer: t } }
      ]
    });
  }
  createPreprocessBindGroup(e, r, t, a, s) {
    return e.createBindGroup({
      label: "Preprocess bind group",
      layout: this.preprocessBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: r } },
        { binding: 1, resource: { buffer: a } },
        { binding: 2, resource: { buffer: s } },
        { binding: 3, resource: { buffer: t } }
      ]
    });
  }
  recordCalculateHistogram(e, r, t) {
    const { count_ru_histo: a } = this.getScatterHistogramSizes(r), s = _ * d, c = Math.ceil(a / s);
    {
      const n = t.beginComputePass({ label: "RS::Zero" });
      n.setBindGroup(0, e), n.setPipeline(this.zero_p), n.dispatchWorkgroups(c, 1, 1), n.end();
    }
    {
      const n = t.beginComputePass({ label: "RS::Histogram" });
      n.setBindGroup(0, e), n.setPipeline(this.histogram_p), n.dispatchWorkgroups(c, 1, 1), n.end();
    }
  }
  recordPrefixHistogram(e, r, t) {
    const a = t.beginComputePass({ label: "Radix Sort :: Prefix Sum Pass" });
    a.setPipeline(this.prefix_p), a.setBindGroup(0, e), a.dispatchWorkgroups(r, 1, 1), a.end();
  }
  /**
   * Records the 4 radix scatter passes using direct dispatch.
   * Each radix pass is 3 compute passes: scatter_local -> scatter_prefix -> scatter_apply
   */
  recordScatterKeys(e, r, t) {
    const { scatter_blocks_ru: a } = this.getScatterHistogramSizes(r), s = (c, n, o) => {
      {
        const i = t.beginComputePass({ label: `${o}::Local` });
        i.setBindGroup(0, e), i.setPipeline(c), i.dispatchWorkgroups(a, 1, 1), i.end();
      }
      {
        const i = t.beginComputePass({ label: `${o}::Prefix` });
        i.setBindGroup(0, e), i.setPipeline(this.scatter_prefix_p), i.dispatchWorkgroups(1, 1, 1), i.end();
      }
      {
        const i = t.beginComputePass({ label: `${o}::Apply` });
        i.setBindGroup(0, e), i.setPipeline(n), i.dispatchWorkgroups(a, 1, 1), i.end();
      }
    };
    s(this.scatter_local_even_p, this.scatter_apply_even_p, "RS::Scatter0_even"), s(this.scatter_local_odd_p, this.scatter_apply_odd_p, "RS::Scatter1_odd"), s(this.scatter_local_even_p, this.scatter_apply_even_p, "RS::Scatter2_even"), s(this.scatter_local_odd_p, this.scatter_apply_odd_p, "RS::Scatter3_odd");
  }
  /**
   * Records a single 3-phase scatter pass using indirect dispatch.
   */
  recordScatterPassIndirect(e, r, t, a) {
    const s = t ? this.scatter_local_even_p : this.scatter_local_odd_p, c = t ? this.scatter_apply_even_p : this.scatter_apply_odd_p, n = t ? "even" : "odd";
    {
      const o = a.beginComputePass({ label: `RS::ScatterLocal_${n} (Indirect)` });
      o.setBindGroup(0, e), o.setPipeline(s), o.dispatchWorkgroupsIndirect(r, 0), o.end();
    }
    {
      const o = a.beginComputePass({ label: `RS::ScatterPrefix_${n} (Indirect)` });
      o.setBindGroup(0, e), o.setPipeline(this.scatter_prefix_p), o.dispatchWorkgroups(1, 1, 1), o.end();
    }
    {
      const o = a.beginComputePass({ label: `RS::ScatterApply_${n} (Indirect)` });
      o.setBindGroup(0, e), o.setPipeline(c), o.dispatchWorkgroupsIndirect(r, 0), o.end();
    }
  }
  /**
   * Helper function to download buffer data from the GPU.
   */
  async downloadBuffer(e, r, t, a) {
    const s = e.createBuffer({
      label: "Download buffer",
      size: t.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    }), c = e.createCommandEncoder({ label: "Copy encoder" });
    c.copyBufferToBuffer(t, 0, s, 0, t.size), r.submit([c.finish()]), await s.mapAsync(GPUMapMode.READ);
    const n = s.getMappedRange();
    let o;
    return a === "f32" ? o = new Float32Array(n.slice(0)) : o = new Uint32Array(n.slice(0)), s.unmap(), s.destroy(), o;
  }
}
export {
  g as G
};
