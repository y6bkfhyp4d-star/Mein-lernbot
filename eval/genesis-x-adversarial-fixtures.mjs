/* Public adversarial scenarios, independent of GENESIS X engine code.
   Only x/b inputs are supplied to the research modules, never oracle outputs.
   Not a sealed or truly blind benchmark. */
const freezeSuite=(name,train,validate,pairs)=>Object.freeze({
 name,
 numericTraining:Object.freeze(train.map(x=>Object.freeze({x,y:x+2}))),
 numericValidation:Object.freeze(validate.map(x=>Object.freeze({x,y:x+2}))),
 cases:Object.freeze(pairs.map(([x,b])=>Object.freeze({x,b})))
});
export const adversarialSuites=Object.freeze([
 freezeSuite('comparison-boundaries',[0,1,2],[4,7],[
  [3,5],[3,4.999999],[3,5.000001],
  [-3,-1],[-3,-1.5],[-3,-0.5],
  [1000000,1000000],[-1000000,-999998],
  [999998,1000000],[-999999,-999998]
 ]),
 freezeSuite('signed-fractions',[-9,-4,-2],[-1,6],[
  [3.25,5.25],[3.25,5],[3.25,5.5],
  [-4.75,-2.75],[-4.75,-3],[-4.75,-3.25],
  [0.5,2.5],[-0.5,1.5],
  [25.125,27.125],[-25.125,-22.875]
 ]),
 freezeSuite('distribution-shift',[50,51,52],[55,60],[
  [30,0],[30,32],[30,33],
  [-30,-29],[-30,-28],
  [65536,65537],[65536,65538],[-65536,-65534],
  [1234.5,1236.25],[-1234.5,-1232.5]
 ])
]);
