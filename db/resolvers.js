const Usuario = require('../models/Usuario')
const Proyecto = require('../models/Proyecto')
const Tarea = require('../models/Tarea')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config({ path: 'variables.env' })

const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre} = usuario;
    return jwt.sign({ id, email, nombre }, secreta, { expiresIn });
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
            const proyectos = await Proyecto.find({creador: ctx.usuario.id})
            return proyectos
        },
        
        obtenerTareas: async (_, {input}, ctx) => {
            const tareas = await Tarea.find({creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto)
            return tareas
        },
    },
    Mutation: {
        //USUARIOS
        crearUsuario: async (_, {input}) => {
            const { email, password } = input;

            //Validacion previa de existencia de usuario
            const existeUsuario = await Usuario.findOne( {email} )
            if(existeUsuario){
                throw new Error('El usuario ya está registrado.')
            }


            //Inserta en BD
            try {
                //Hashear password 
                const salt = await bcryptjs.genSalt(10)
                input.password = await bcryptjs.hash(password, salt)
                // console.log(input)


                const nuevoUsuario = new Usuario(input)
                // console.log(nuevoUsuario)
                nuevoUsuario.save()
                return "Usuario Creado Correctamente."
            } catch (error) {
                console.log(error)
            }
        },

        autenticarUsuario: async (_, {input}) => {
            const { email, password } = input;
            
            //Validacion previa de existencia de usuario
            const existeUsuario = await Usuario.findOne( {email} )
            if(!existeUsuario){
                throw new Error('El usuario no existe.')
            }

            //Revision de password
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password)
            // console.log(passwordCorrecto)
            if(!passwordCorrecto){
                throw new Error('Password incorrecto.')
            }

            //Dar acceso a la app
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '2hr' )
            }

        },

        //PROYECTO
        nuevoProyecto: async (_, {input}, ctx) => {
            // console.log('DESDE RESOLVER', ctx)
            try {
                const proyecto = new Proyecto(input)

                //asociar al creador desde el context definido en index.js
                proyecto.creador = ctx.usuario.id

                //almacenar en BD
                const resultado = await proyecto.save()
                return resultado

            } catch (error) {
                console.log(error)
            }

        },

        actualizarProyecto: async (_, {id, input}, ctx) => {
            // Revisar que proyecto existe
            let proyecto = await Proyecto.findById(id)
            if(!proyecto){
                throw new Error('Proyecto no encontrado.')
            }

            // Revisar que persona que trata de editar es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes los permisos de edición.')
            }

            // Guardar Proyecto
            proyecto = await Proyecto.findOneAndUpdate({_id: id}, input, {new: true})
            return proyecto
        },

        eliminarProyecto: async (_, {id}, ctx) => {
            // Revisar que proyecto existe
            let proyecto = await Proyecto.findById(id)
            if(!proyecto){
                throw new Error('Proyecto no encontrado.')
            }

            // Revisar que persona que trata de editar es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes los permisos de edición.')
            }
            
            //Eliminar Proyecto
            await Proyecto.findOneAndDelete({_id : id})
            return "Proyecto Eliminado."
        
        },


        //TAREA
        nuevaTarea: async (_, {input}, ctx) => {
            try {
                const tarea = new Tarea(input)
                tarea.creador = ctx.usuario.id
                const resultado = await tarea.save()
                return resultado
            } catch (error) {
                console.log(error)
            }

        },

        actualizarTarea: async (_, {id, input, estado}, ctx) => {
            //Verificar si tarea existe
            const tarea = await Tarea.findById(id) 
            if(!tarea){
                throw new Error('Tarea no encontrada.')
            }

            // Revisar que persona que trata de editar es el creador
            if(tarea.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes los permisos de edición.')
            }

            // Asignar estado
            input.estado = estado
            
            // Guardar
            tarea = await Tarea.findOneAndUpdate({_id: id}, input, {new: true})
            return tarea

        },

        eliminarTarea: async (_, {id}, ctx) => {
            // Revisar que tarea existe
            let tarea = await Tarea.findById(id)
            if(!tarea){
                throw new Error('Tarea no encontrada.')
            }

            // Revisar que persona que trata de editar es el creador
            if(tarea.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes los permisos de edición.')
            }
            
            //Eliminar Proyecto
            await Tarea.findOneAndDelete({_id : id})
            return "Tarea Eliminada."
        
        },
    }
}

module.exports = resolvers;
