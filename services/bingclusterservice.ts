import { Injectable, NgZone } from '@angular/core';
import { IMarkerOptions } from "../interfaces/imarkeroptions";
import { IClusterOptions } from "../interfaces/iclusteroptions"; 
import { IMarkerIconInfo } from "../interfaces/imarkericoninfo";
import { Marker } from '../models/marker';
import { BingMarker } from '../models/bingmarker';
import { BingClusterLayer } from "../models/bingclusterlayer";
import { Layer } from '../models/layer';
import { MarkerTypeId } from "../models/markertypeid";
import { MapService } from "./mapservice";
import { ClusterLayer } from "../components/clusterLayer";
import { ClusterService } from "./clusterservice";
import { BingLayerBase } from "./binglayerbase";
import { BingMapService } from "./bingmapservice";
import { BingConversions } from "./bingconversions";

@Injectable()
export class BingClusterService extends BingLayerBase implements ClusterService {

    protected _layers: Map<ClusterLayer, Promise<Layer>> = new Map<ClusterLayer, Promise<Layer>>();

    constructor(_mapService: MapService, private _zone: NgZone) {
        super(_mapService);
     }

    public AddLayer(layer: ClusterLayer): void{
        let options: IClusterOptions = {
            id: layer.Id,
            visible: layer.Visible,
            clusteringEnabled: layer.ClusteringEnbabled
        };
        if(layer.GridSize) options.gridSize = layer.GridSize;
        if(layer.LayerOffset) options.layerOffset = layer.LayerOffset;
        if(layer.ZIndex) options.zIndex = layer.ZIndex;
        if(layer.IconInfo) options.clusteredPinCallback = (pin:Microsoft.Maps.ClusterPushpin) => { this.CreateClusterPushPin(pin, layer); };
        if(layer.CustomMarkerCallback) options.clusteredPinCallback = (pin:Microsoft.Maps.ClusterPushpin) => { this.CreateCustomClusterPushPin(pin, layer); };

        const layerPromise = this._mapService.CreateClusterLayer(options);
        this._layers.set(layer, layerPromise);       
    }

    public GetNativeLayer(layer: ClusterLayer): Promise<Layer> {
        return this._layers.get(layer);
    }

    public DeleteLayer(layer: ClusterLayer): Promise<void> {
        const l = this._layers.get(layer);
        if (l == null) {
            return Promise.resolve();
        }
        return l.then((l: Layer) => {
            return this._zone.run(() => {
                l.Delete();
                this._layers.delete(layer);
            });
        });
    }

    private CreateClusterPushPin(cluster: Microsoft.Maps.ClusterPushpin, layer:ClusterLayer){
        this._layers.get(layer).then((l:BingClusterLayer) =>{
            if(layer.IconInfo){
                let o: Microsoft.Maps.IPushpinOptions = {};
                o.icon = Marker.CreateMarker(layer.IconInfo);
                if(o.icon != ""){
                    o.anchor = new Microsoft.Maps.Point(
                        (layer.IconInfo.size && layer.IconInfo.markerOffsetRatio) ? (layer.IconInfo.size.width * layer.IconInfo.markerOffsetRatio.x) : 0,
                        (layer.IconInfo.size && layer.IconInfo.markerOffsetRatio) ? (layer.IconInfo.size.height * layer.IconInfo.markerOffsetRatio.y) : 0
                    );
                    cluster.setOptions(o);
                }
            }
        });
    }

    private CreateCustomClusterPushPin(cluster: Microsoft.Maps.ClusterPushpin, layer:ClusterLayer){
        this._layers.get(layer).then((l:BingClusterLayer) => {
            // assemble markers for callback
            let m:Array<Marker> = new Array<Marker>();
            cluster.containedPushpins.forEach(p => {
                let marker:Marker = l.GetMarkerFromBingMarker(p)
                if(marker) m.push(marker);
            });
            let iconInfo: IMarkerIconInfo = { markerType: MarkerTypeId.None };
            let o: Microsoft.Maps.IPushpinOptions = {};
            o.icon = layer.CustomMarkerCallback(m, iconInfo);
            if(o.icon != ""){
                o.anchor = new Microsoft.Maps.Point(
                    (iconInfo.size && iconInfo.markerOffsetRatio) ? (iconInfo.size.width * iconInfo.markerOffsetRatio.x) : 0,
                    (iconInfo.size && iconInfo.markerOffsetRatio) ? (iconInfo.size.height * iconInfo.markerOffsetRatio.y) : 0
                );
                if(iconInfo.textOffset) o.textOffset = new Microsoft.Maps.Point(iconInfo.textOffset.x, iconInfo.textOffset.y);
                cluster.setOptions(o);
            }
        });
    }

}