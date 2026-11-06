# The six crowd poses: rotations (bones, world axis R right/F forward/U up, radians) laid over the idle clip
import json
LA='LeftArm LeftForeArm LeftHand'; RA='RightArm RightForeArm RightHand'; LF='LeftForeArm LeftHand'; RF='RightForeArm RightHand'
TOR='Spine Spine1 Spine2 Neck Head LeftShoulder LeftArm LeftForeArm LeftHand RightShoulder RightArm RightForeArm RightHand'
P = {
 'sit':   dict(clip='idle', t=0.5, seat=True, ops=[[LA,'R',0.35],[RA,'R',0.35],[LF,'R',0.95],[RF,'R',0.95],[LA,'F',-0.1],[RA,'F',0.1]]),
 'clapA': dict(clip='idle', t=0.5, seat=True, ops=[[LA,'R',0.8],[RA,'R',0.8],[LF,'R',0.9],[RF,'R',0.9],[LA,'U',-0.1],[RA,'U',0.1],[LF,'U',-0.45],[RF,'U',0.45]]),
 'clapB': dict(clip='idle', t=0.5, seat=True, ops=[[LA,'R',0.8],[RA,'R',0.8],[LF,'R',0.9],[RF,'R',0.9],[LA,'U',-0.22],[RA,'U',0.22],[LF,'U',-0.72],[RF,'U',0.72]]),
 'groan': dict(clip='idle', t=0.5, seat=True, ops=[[TOR,'R',0.15],[LA,'F',2.45],[RA,'F',-2.45],[LF,'F',2.2],[RF,'F',-2.2],[LA,'R',0.35],[RA,'R',0.35]]),
 'upA':   dict(clip='idle', t=0.5, ops=[[LA,'F',2.45],[RA,'F',-2.45],[LF,'F',0.15],[RF,'F',-0.15],[LA,'R',0.2],[RA,'R',0.2]], hip=0.1),
 'upB':   dict(clip='idle', t=0.5, ops=[[LA,'F',1.5],[RA,'F',-1.5],[LF,'F',1.5],[RF,'F',-1.5],[LA,'R',0.3],[RA,'R',0.3],['LeftLeg LeftFoot','R',-0.5],['RightLeg RightFoot','R',-0.5],['LeftUpLeg LeftLeg LeftFoot','R',0.25],['RightUpLeg RightLeg RightFoot','R',0.25]], hip=-0.1),
}
import os
json.dump(P, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'poses.json'), 'w'))
import urllib.parse; print(urllib.parse.quote(json.dumps(list(P.values()))))
