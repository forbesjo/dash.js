/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _streamingVoTrackInfo = require('../streaming/vo/TrackInfo');

var _streamingVoTrackInfo2 = _interopRequireDefault(_streamingVoTrackInfo);

var _streamingVoMediaInfo = require('../streaming/vo/MediaInfo');

var _streamingVoMediaInfo2 = _interopRequireDefault(_streamingVoMediaInfo);

var _streamingVoStreamInfo = require('../streaming/vo/StreamInfo');

var _streamingVoStreamInfo2 = _interopRequireDefault(_streamingVoStreamInfo);

var _streamingVoManifestInfo = require('../streaming/vo/ManifestInfo');

var _streamingVoManifestInfo2 = _interopRequireDefault(_streamingVoManifestInfo);

var _voEvent = require('./vo/Event');

var _voEvent2 = _interopRequireDefault(_voEvent);

var _coreFactoryMaker = require('../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _externalsCea608Parser = require('../../externals/cea608-parser');

var _externalsCea608Parser2 = _interopRequireDefault(_externalsCea608Parser);

var _constantsDashMetricsList = require('./constants/DashMetricsList');

var METRIC_LIST = _interopRequireWildcard(_constantsDashMetricsList);

function DashAdapter() {

    //let context = this.context;

    var instance = undefined,
        dashManifestModel = undefined,
        periods = undefined,
        adaptations = undefined;

    function setConfig(config) {
        if (!config) return;

        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
    }

    function initialize() {
        periods = [];
        adaptations = {};
    }

    function getRepresentationForTrackInfo(trackInfo, representationController) {
        return representationController.getRepresentationForQuality(trackInfo.quality);
    }

    function getAdaptationForMediaInfo(mediaInfo) {
        if (!adaptations || !mediaInfo || !adaptations[mediaInfo.streamInfo.id]) return null;
        return adaptations[mediaInfo.streamInfo.id][mediaInfo.index];
    }

    function getPeriodForStreamInfo(streamInfo) {
        var ln = periods.length;

        for (var i = 0; i < ln; i++) {
            var period = periods[i];

            if (streamInfo.id === period.id) return period;
        }

        return null;
    }

    function convertRepresentationToTrackInfo(manifest, representation) {
        var trackInfo = new _streamingVoTrackInfo2['default']();
        var a = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index];
        var r = dashManifestModel.getRepresentationFor(representation.index, a);

        trackInfo.id = representation.id;
        trackInfo.quality = representation.index;
        trackInfo.bandwidth = dashManifestModel.getBandwidth(r);
        trackInfo.DVRWindow = representation.segmentAvailabilityRange;
        trackInfo.fragmentDuration = representation.segmentDuration || (representation.segments && representation.segments.length > 0 ? representation.segments[0].duration : NaN);
        trackInfo.MSETimeOffset = representation.MSETimeOffset;
        trackInfo.useCalculatedLiveEdgeTime = representation.useCalculatedLiveEdgeTime;
        trackInfo.mediaInfo = convertAdaptationToMediaInfo(manifest, representation.adaptation);

        return trackInfo;
    }

    function convertAdaptationToMediaInfo(manifest, adaptation) {
        var mediaInfo = new _streamingVoMediaInfo2['default']();
        var a = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
        var viewpoint;

        mediaInfo.id = adaptation.id;
        mediaInfo.index = adaptation.index;
        mediaInfo.type = adaptation.type;
        mediaInfo.streamInfo = convertPeriodToStreamInfo(manifest, adaptation.period);
        mediaInfo.representationCount = dashManifestModel.getRepresentationCount(a);
        mediaInfo.lang = dashManifestModel.getLanguageForAdaptation(a);
        viewpoint = dashManifestModel.getViewpointForAdaptation(a);
        mediaInfo.viewpoint = viewpoint ? viewpoint.value : undefined;
        mediaInfo.accessibility = dashManifestModel.getAccessibilityForAdaptation(a).map(function (accessibility) {
            var accessibilityValue = accessibility.value;
            var accessibilityData = accessibilityValue;
            if (accessibility.schemeIdUri && accessibility.schemeIdUri.search('cea-608') >= 0 && typeof _externalsCea608Parser2['default'] !== 'undefined') {
                if (accessibilityValue) {
                    accessibilityData = 'cea-608:' + accessibilityValue;
                } else {
                    accessibilityData = 'cea-608';
                }
                mediaInfo.embeddedCaptions = true;
            }
            return accessibilityData;
        });
        mediaInfo.audioChannelConfiguration = dashManifestModel.getAudioChannelConfigurationForAdaptation(a).map(function (audioChannelConfiguration) {
            return audioChannelConfiguration.value;
        });
        mediaInfo.roles = dashManifestModel.getRolesForAdaptation(a).map(function (role) {
            return role.value;
        });
        mediaInfo.codec = dashManifestModel.getCodec(a);
        mediaInfo.mimeType = dashManifestModel.getMimeType(a);
        mediaInfo.contentProtection = dashManifestModel.getContentProtectionData(a);
        mediaInfo.bitrateList = dashManifestModel.getBitrateListForAdaptation(a);

        if (mediaInfo.contentProtection) {
            mediaInfo.contentProtection.forEach(function (item) {
                item.KID = dashManifestModel.getKID(item);
            });
        }

        mediaInfo.isText = dashManifestModel.getIsTextTrack(mediaInfo.mimeType);

        return mediaInfo;
    }

    function convertVideoInfoToEmbeddedTextInfo(mediaInfo, channel, lang) {
        mediaInfo.id = channel; // CC1, CC2, CC3, or CC4
        mediaInfo.index = 100 + parseInt(channel.substring(2, 3));
        mediaInfo.type = 'embeddedText';
        mediaInfo.codec = 'cea-608-in-SEI';
        mediaInfo.isText = true;
        mediaInfo.isEmbedded = true;
        mediaInfo.lang = channel + ' ' + lang;
        mediaInfo.roles = ['caption'];
    }

    function convertPeriodToStreamInfo(manifest, period) {
        var streamInfo = new _streamingVoStreamInfo2['default']();
        var THRESHOLD = 1;

        streamInfo.id = period.id;
        streamInfo.index = period.index;
        streamInfo.start = period.start;
        streamInfo.duration = period.duration;
        streamInfo.manifestInfo = convertMpdToManifestInfo(manifest, period.mpd);
        streamInfo.isLast = manifest.Period_asArray.length === 1 || Math.abs(streamInfo.start + streamInfo.duration - streamInfo.manifestInfo.duration) < THRESHOLD;
        streamInfo.isFirst = manifest.Period_asArray.length === 1 || dashManifestModel.getRegularPeriods(manifest, dashManifestModel.getMpd(manifest))[0].id === period.id;

        return streamInfo;
    }

    function convertMpdToManifestInfo(manifest, mpd) {
        var manifestInfo = new _streamingVoManifestInfo2['default']();

        manifestInfo.DVRWindowSize = mpd.timeShiftBufferDepth;
        manifestInfo.loadedTime = mpd.manifest.loadedTime;
        manifestInfo.availableFrom = mpd.availabilityStartTime;
        manifestInfo.minBufferTime = mpd.manifest.minBufferTime;
        manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration;
        manifestInfo.duration = dashManifestModel.getDuration(manifest);
        manifestInfo.isDynamic = dashManifestModel.getIsDynamic(manifest);

        return manifestInfo;
    }

    function getMediaInfoForType(manifest, streamInfo, type) {

        var data = dashManifestModel.getAdaptationForType(manifest, streamInfo.index, type, streamInfo);
        if (!data) return null;

        var periodInfo = getPeriodForStreamInfo(streamInfo);
        var periodId = periodInfo.id;
        var idx = dashManifestModel.getIndexForAdaptation(data, manifest, streamInfo.index);

        adaptations[periodId] = adaptations[periodId] || dashManifestModel.getAdaptationsForPeriod(manifest, periodInfo);

        return convertAdaptationToMediaInfo(manifest, adaptations[periodId][idx]);
    }

    function getAllMediaInfoForType(manifest, streamInfo, type) {
        var periodInfo = getPeriodForStreamInfo(streamInfo);
        var periodId = periodInfo.id;
        var adaptationsForType = dashManifestModel.getAdaptationsForType(manifest, streamInfo.index, type !== 'embeddedText' ? type : 'video');

        var mediaArr = [];

        var data, media, idx, i, j, ln;

        if (!adaptationsForType) return mediaArr;

        adaptations[periodId] = adaptations[periodId] || dashManifestModel.getAdaptationsForPeriod(manifest, periodInfo);

        for (i = 0, ln = adaptationsForType.length; i < ln; i++) {
            data = adaptationsForType[i];
            idx = dashManifestModel.getIndexForAdaptation(data, manifest, streamInfo.index);
            media = convertAdaptationToMediaInfo(manifest, adaptations[periodId][idx]);

            if (type === 'embeddedText') {
                var accessibilityLength = media.accessibility.length;
                for (j = 0; j < accessibilityLength; j++) {
                    if (!media) {
                        continue;
                    }
                    var accessibility = media.accessibility[j];
                    if (accessibility.indexOf('cea-608:') === 0) {
                        var value = accessibility.substring(8);
                        var parts = value.split(';');
                        if (parts[0].substring(0, 2) === 'CC') {
                            for (j = 0; j < parts.length; j++) {
                                if (!media) {
                                    media = convertAdaptationToMediaInfo.call(this, manifest, adaptations[periodId][idx]);
                                }
                                convertVideoInfoToEmbeddedTextInfo(media, parts[j].substring(0, 3), parts[j].substring(4));
                                mediaArr.push(media);
                                media = null;
                            }
                        } else {
                            for (j = 0; j < parts.length; j++) {
                                // Only languages for CC1, CC2, ...
                                if (!media) {
                                    media = convertAdaptationToMediaInfo.call(this, manifest, adaptations[periodId][idx]);
                                }
                                convertVideoInfoToEmbeddedTextInfo(media, 'CC' + (j + 1), parts[j]);
                                mediaArr.push(media);
                                media = null;
                            }
                        }
                    } else if (accessibility.indexOf('cea-608') === 0) {
                        // Nothing known. We interpret it as CC1=eng
                        convertVideoInfoToEmbeddedTextInfo(media, 'CC1', 'eng');
                        mediaArr.push(media);
                        media = null;
                    }
                }
            }
            if (media && type !== 'embeddedText') {
                mediaArr.push(media);
            }
        }

        return mediaArr;
    }

    function getStreamsInfo(manifest) {

        if (!manifest) return null;

        var streams = [];
        var mpd = dashManifestModel.getMpd(manifest);

        periods = dashManifestModel.getRegularPeriods(manifest, mpd);
        adaptations = {};

        for (var i = 0, ln = periods.length; i < ln; i++) {
            streams.push(convertPeriodToStreamInfo(manifest, periods[i]));
        }

        return streams;
    }

    function getManifestInfo(manifest) {
        var mpd = dashManifestModel.getMpd(manifest);
        return convertMpdToManifestInfo(manifest, mpd);
    }

    function getInitRequest(streamProcessor, quality) {
        var representation = streamProcessor.getRepresentationController().getRepresentationForQuality(quality);
        return streamProcessor.getIndexHandler().getInitRequest(representation);
    }

    function getNextFragmentRequest(streamProcessor, trackInfo) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.getRepresentationController());
        return streamProcessor.getIndexHandler().getNextSegmentRequest(representation);
    }

    function getFragmentRequestForTime(streamProcessor, trackInfo, time, options) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.getRepresentationController());
        return streamProcessor.getIndexHandler().getSegmentRequestForTime(representation, time, options);
    }

    function generateFragmentRequestForTime(streamProcessor, trackInfo, time) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.getRepresentationController());
        return streamProcessor.getIndexHandler().generateSegmentRequestForTime(representation, time);
    }

    function getIndexHandlerTime(streamProcessor) {
        return streamProcessor.getIndexHandler().getCurrentTime();
    }

    function setIndexHandlerTime(streamProcessor, value) {
        return streamProcessor.getIndexHandler().setCurrentTime(value);
    }

    function updateData(manifest, streamProcessor) {
        var periodInfo = getPeriodForStreamInfo(streamProcessor.getStreamInfo());
        var mediaInfo = streamProcessor.getMediaInfo();
        var adaptation = getAdaptationForMediaInfo(mediaInfo);
        var type = streamProcessor.getType();

        var id, data;

        id = mediaInfo.id;
        data = id ? dashManifestModel.getAdaptationForId(id, manifest, periodInfo.index) : dashManifestModel.getAdaptationForIndex(mediaInfo.index, manifest, periodInfo.index);
        streamProcessor.getRepresentationController().updateData(data, adaptation, type);
    }

    function getRepresentationInfoForQuality(manifest, representationController, quality) {
        var representation = representationController.getRepresentationForQuality(quality);
        return representation ? convertRepresentationToTrackInfo(manifest, representation) : null;
    }

    function getCurrentRepresentationInfo(manifest, representationController) {
        var representation = representationController.getCurrentRepresentation();
        return representation ? convertRepresentationToTrackInfo(manifest, representation) : null;
    }

    function getEvent(eventBox, eventStreams, startTime) {
        var event = new _voEvent2['default']();
        var schemeIdUri = eventBox.scheme_id_uri;
        var value = eventBox.value;
        var timescale = eventBox.timescale;
        var presentationTimeDelta = eventBox.presentation_time_delta;
        var duration = eventBox.event_duration;
        var id = eventBox.id;
        var messageData = eventBox.message_data;
        var presentationTime = startTime * timescale + presentationTimeDelta;

        if (!eventStreams[schemeIdUri]) return null;

        event.eventStream = eventStreams[schemeIdUri];
        event.eventStream.value = value;
        event.eventStream.timescale = timescale;
        event.duration = duration;
        event.id = id;
        event.presentationTime = presentationTime;
        event.messageData = messageData;
        event.presentationTimeDelta = presentationTimeDelta;

        return event;
    }

    function getEventsFor(manifest, info, streamProcessor) {
        var events = [];

        if (info instanceof _streamingVoStreamInfo2['default']) {
            events = dashManifestModel.getEventsForPeriod(manifest, getPeriodForStreamInfo(info));
        } else if (info instanceof _streamingVoMediaInfo2['default']) {
            events = dashManifestModel.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info));
        } else if (info instanceof _streamingVoTrackInfo2['default']) {
            events = dashManifestModel.getEventStreamForRepresentation(manifest, getRepresentationForTrackInfo(info, streamProcessor.getRepresentationController()));
        }

        return events;
    }

    function reset() {
        periods = [];
        adaptations = {};
    }

    instance = {
        initialize: initialize,
        convertDataToTrack: convertRepresentationToTrackInfo,
        convertDataToMedia: convertAdaptationToMediaInfo,
        convertDataToStream: convertPeriodToStreamInfo,
        getDataForTrack: getRepresentationForTrackInfo,
        getDataForMedia: getAdaptationForMediaInfo,
        getDataForStream: getPeriodForStreamInfo,
        getStreamsInfo: getStreamsInfo,
        getManifestInfo: getManifestInfo,
        getMediaInfoForType: getMediaInfoForType,
        getAllMediaInfoForType: getAllMediaInfoForType,
        getCurrentRepresentationInfo: getCurrentRepresentationInfo,
        getRepresentationInfoForQuality: getRepresentationInfoForQuality,
        updateData: updateData,
        getInitRequest: getInitRequest,
        getNextFragmentRequest: getNextFragmentRequest,
        getFragmentRequestForTime: getFragmentRequestForTime,
        generateFragmentRequestForTime: generateFragmentRequestForTime,
        getIndexHandlerTime: getIndexHandlerTime,
        setIndexHandlerTime: setIndexHandlerTime,
        getEventsFor: getEventsFor,
        getEvent: getEvent,
        setConfig: setConfig,
        reset: reset,
        metricsList: METRIC_LIST
    };

    return instance;
}

DashAdapter.__dashjs_factory_name = 'DashAdapter';
exports['default'] = _coreFactoryMaker2['default'].getSingletonFactory(DashAdapter);
module.exports = exports['default'];
//# sourceMappingURL=DashAdapter.js.map