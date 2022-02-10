import React, { useEffect, useState } from 'react';
import Socket from 'socket.io-client';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Dimensions,
  TouchableOpacity
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals
} from 'react-native-webrtc';

const dimensions = Dimensions.get('window');

const App = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socket] = useState(
    Socket.connect('https://ae73-211-35-233-150.ngrok.io/webrtcPeer', {
      path: '/webrtc',
      query: {},
    })
  );

  const mySdp = null;
  const candidates = [];

  const configuration = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };
  const pc = new RTCPeerConnection(configuration);

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      sendToPeer('candidate', e.candidate);
    }
  };

  pc.oniceconnectionstatechange = (e) => {
    console.log(e);
  };

  pc.onaddstream = (e) => {
    setRemoteStream(e.stream);
  };

  const sendToPeer = (messageType, payload) => {
    socket.emit(messageType, {
      socketID: socket.id,
      payload,
    });
  };

  const createOffer = () => {
    console.log('offer');

    pc.createOffer({ offerToReceiveVideo: 1 }).then(sdp => {
      pc.setLocalDescription(sdp);
      sendToPeer('offerOrAnswer', sdp);
    });
  };

  const createAnswer = () => {
    console.log('answer');
    pc.createAnswer({ offerToReceiveVideo: 1 }).then(sdp => {
      pc.setLocalDescription(sdp);
      sendToPeer('offerOrAnswer', sdp);
    });
  };

  const setRemoteDescription = () => {
    const desc = JSON.parse(mySdp);
    pc.setRemoteDescription(new RTCSessionDescription(desc));
  };

  const addCandidate = () => {
    candidates.forEach(candidate => {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  useEffect(() => {
    if (localStream) {
      pc.addStream(localStream);

      socket.on('connection-success', success => {
        console.log(success);
      });

      socket.on('offerOrAnswer', (sdp) => {
        mySdp = JSON.stringify(sdp);
        pc.setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on('candidate', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }
  }, []);

  useEffect(() => {
    if (!localStream) {
      (async () => {
        const availableDevices = await mediaDevices.enumerateDevices();
        const { deviceId: sourceId } = availableDevices.find(
          device => device.kind === 'videoinput' && device.facing === 'front',
        );

        const streamBuffer = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            mandatory: {
              // Provide your own width, height and frame rate here
              minWidth: 200,
              minHeight: 200,
              minFrameRate: 30,
            },
            facingMode: 'user',
            optional: [{ sourceId }],
          },
        });

        setLocalStream(streamBuffer);
      })();
    }
  }, [localStream]);

  const RemoteVideo = remoteStream ?
    (<RTCView streamURL={remoteStream?.toURL()} style={{ width: 100, height: 200 }} />) :
    (
      <View styles={{ display: 'flex', justifyContent: 'center', alignItmes: 'center' }}>
        <Text style={{ fontSize: 22, color: 'black' }}>
          waiting for connection
        </Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={createOffer}>
          <Text style={styles.textContent}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={createAnswer}>
          <Text style={styles.textContent}>Answer</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.videosContainer}>
        {RemoteVideo}
        <RTCView streamURL={localStream?.toURL()} style={styles.localVideo} />
      </View>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    margin: 5,
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5,
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center',
  },
  videosContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  localVideo: {
    position: 'absolute',
    backgroundColor: 'black',
    width: 100,
    height: 200,
    bottom: 10,
    right: 10,
  },
  remoteVideo: {
    width: '100%',
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItmes: 'center',
  },
});

export default App;
